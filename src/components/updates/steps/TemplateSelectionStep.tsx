import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Megaphone, Calendar, Shield, Newspaper, Sparkles } from 'lucide-react';
import { WizardFormData } from '../CreateUpdateWizard';
import { UpdateTemplate } from '@/types/updateTemplates';
import { UPDATE_TEMPLATES } from '@/data/updateTemplates';

interface TemplateSelectionStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'announcement': return Megaphone;
    case 'news': return Newspaper;
    case 'event': return Calendar;
    case 'policy': return Shield;
    default: return FileText;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'announcement': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'news': return 'bg-green-500/10 text-green-600 border-green-200';
    case 'event': return 'bg-purple-500/10 text-purple-600 border-purple-200';
    case 'policy': return 'bg-gray-500/10 text-gray-600 border-gray-200';
    default: return 'bg-blue-500/10 text-blue-600 border-blue-200';
  }
};

export function TemplateSelectionStep({ formData, updateFormData }: TemplateSelectionStepProps) {
  const handleTemplateSelect = (template?: UpdateTemplate) => {
    if (template) {
      updateFormData({
        template,
        type: template.type,
        title: template.defaultTitle || formData.title,
        content: template.defaultContent || formData.content,
        backgroundStyle: template.backgroundStyle
      });
    } else {
      // Start from scratch
      updateFormData({
        template: undefined,
        type: 'announcement',
        title: '',
        content: '',
        backgroundStyle: { type: 'solid', primary: '#3b82f6' }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Choose Your Starting Point</h3>
        <p className="text-muted-foreground">
          Select a template to get started quickly, or start from scratch
        </p>
      </div>

      {/* Start from Scratch Option */}
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          !formData.template ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => handleTemplateSelect(undefined)}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Start from Scratch</h4>
              <p className="text-sm text-muted-foreground">
                Create a custom update with full creative control
              </p>
            </div>
            {!formData.template && (
              <Badge variant="default">Selected</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {UPDATE_TEMPLATES.map((template) => {
          const TypeIcon = getTypeIcon(template.type);
          const isSelected = formData.template?.id === template.id;
          
          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getTypeColor(template.type)}
                  >
                    {template.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {template.description}
                </p>
                
                {/* Background Preview */}
                <div 
                  className="h-12 rounded-md mb-3"
                  style={{
                    background: template.backgroundStyle.type === 'gradient'
                      ? `linear-gradient(135deg, ${template.backgroundStyle.primary}, ${template.backgroundStyle.secondary})`
                      : template.backgroundStyle.primary
                  }}
                />
                
                <p className="text-xs text-muted-foreground">
                  {template.preview}
                </p>
                
                {isSelected && (
                  <Badge variant="default" className="mt-2">
                    Selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}