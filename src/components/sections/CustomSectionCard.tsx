import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { EditSectionDialog } from './EditSectionDialog';
import { CustomSection } from '@/hooks/useCustomSections';

interface CustomSectionCardProps {
  section: CustomSection;
  isEnabled: boolean;
  canToggle: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export default function CustomSectionCard({ 
  section, 
  isEnabled, 
  canToggle, 
  onToggle, 
  onEdit,
  onDelete,
  onDuplicate
}: CustomSectionCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEdit = () => {
    setShowEditDialog(true);
    onEdit?.();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${section.name}"? This action cannot be undone.`)) {
      onDelete?.();
    }
  };

  return (
    <Card className={`transition-all border-l-4 ${
      isEnabled 
        ? 'bg-green-50/50 border-green-200 border-l-green-500' 
        : 'bg-gray-50/50 border-gray-200 border-l-gray-400'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isEnabled ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {section.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    Custom
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      section.category === 'core' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      section.category === 'industry' ? 'bg-green-50 text-green-700 border-green-200' :
                      section.category === 'operations' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {section.category}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={!canToggle}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <CardDescription className="text-sm">
          {section.description || 'No description provided'}
        </CardDescription>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span>Path: {section.path}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 hover:bg-primary hover:text-primary-foreground"
              onClick={handleEdit}
              title="Edit Section"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            
            {onDuplicate && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3"
                onClick={onDuplicate}
                title="Duplicate Section"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleDelete}
              title="Delete Section"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
      
      <EditSectionDialog
        section={section}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </Card>
  );
}