
import { useState } from 'react';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWeekTemplates } from '@/hooks/scheduling/useWeekTemplates';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/public-types';
import { Save, Calendar, Eye } from 'lucide-react';

interface WeekTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

type WeekTemplateRecord = Tables<'week_templates'> & {
  template_data?: {
    metadata?: {
      total_shifts?: number;
    };
  } | null;
};

const getTemplateShiftCount = (template: WeekTemplateRecord): number => {
  const count = template.template_data?.metadata?.total_shifts;
  return typeof count === 'number' ? count : 0;
};

export function WeekTemplateDialog({ open, onOpenChange, selectedDate }: WeekTemplateDialogProps) {
  const { templates: weekTemplates } = useWeekTemplates();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('load');
  const [loading, setLoading] = useState(false);
  
  // Stub data for templates until fully implemented
  const templates = (weekTemplates ?? []) as WeekTemplateRecord[];

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: ''
  });

  const handleSaveTemplate = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would capture the current week's schedule
      const templateData = {
        shifts: [], // Current week's shifts would be serialized here
        metadata: {
          created_from_date: selectedDate.toISOString(),
          total_shifts: 0,
          total_hours: 0
        }
      };

      // TODO: Implement template creation when week templates are fully supported
      logger.debug('Template creation not yet implemented', {
        context: {
          name: newTemplate.name,
          description: newTemplate.description,
          templateData
        }
      });

      setNewTemplate({ name: '', description: '' });
      setActiveTab('load');
      
      toast({
        title: 'Template creation not yet available',
        description: 'Week template creation is coming soon. This feature is not yet implemented.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save template';
      logger.error('Error saving template', { error, context: { name: newTemplate.name } });
      toast({
        title: 'Error saving template',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (template: WeekTemplateRecord) => {
    // In a real implementation, this would apply the template to the current week
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Week Templates</DialogTitle>
          <DialogDescription>
            Save current week as template or load from existing templates
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="load">Load Template</TabsTrigger>
            <TabsTrigger value="save">Save Template</TabsTrigger>
          </TabsList>

          <TabsContent value="load" className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No week templates found</p>
                  <p className="text-sm">Create your first template to get started</p>
                </div>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">{getTemplateShiftCount(template)} shifts</Badge>
                      </div>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Created {new Date(template.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button size="sm" onClick={() => handleLoadTemplate(template)}>
                            Load Template
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="save" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Standard Week, Holiday Schedule"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Describe when to use this template..."
                  rows={3}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Week Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Shifts:</span>
                    <span className="ml-2 font-medium">0</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Hours:</span>
                    <span className="ml-2 font-medium">0</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Staff Assigned:</span>
                    <span className="ml-2 font-medium">0</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Locations:</span>
                    <span className="ml-2 font-medium">0</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveTemplate} 
                disabled={!newTemplate.name || loading}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save as Template'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
