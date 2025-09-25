import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Megaphone, 
  Users, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  BookOpen,
  FileText,
  Plus
} from 'lucide-react';
import { SectionTemplate } from '@/hooks/useCustomSections';

interface SectionTemplateSelectorProps {
  templates: SectionTemplate[];
  onSelectTemplate: (template: SectionTemplate) => void;
  onCreateCustom: () => void;
}

const iconMap = {
  Megaphone,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  BookOpen,
  FileText
};

const categoryColors = {
  communication: 'bg-blue-100 text-blue-800',
  operations: 'bg-green-100 text-green-800',
  hr: 'bg-purple-100 text-purple-800',
  analytics: 'bg-orange-100 text-orange-800',
  custom: 'bg-gray-100 text-gray-800'
};

export default function SectionTemplateSelector({
  templates,
  onSelectTemplate,
  onCreateCustom
}: SectionTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(templates.map(t => t.category)));
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || FileText;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Section
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Section Template</DialogTitle>
          <DialogDescription>
            Select a pre-built template to get started quickly, or create a custom section from scratch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getIconComponent(template.icon)}
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs mt-1 ${categoryColors[template.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-4">
                    {template.description}
                  </CardDescription>
                  
                  {/* Template Features */}
                  {template.config?.features && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.config.features.slice(0, 3).map((feature: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {template.config.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.config.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => onSelectTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Section Option */}
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Create Custom Section</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Build a section from scratch with your own configuration
              </p>
              <Button variant="outline" onClick={onCreateCustom}>
                Start from Scratch
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}