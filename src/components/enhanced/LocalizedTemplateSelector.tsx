import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Utensils, 
  Briefcase, 
  ShoppingCart, 
  Heart, 
  Cog,
  CheckCircle,
  ChevronDown
} from 'lucide-react';
import { BUSINESS_TEMPLATES } from '@/data/businessTemplates';
import { AVAILABLE_SECTIONS } from '@/data/availableSections';
import { BusinessTemplate } from '@/types/templates';
import { useTranslation } from 'react-i18next';
import { I18nHelpers } from '@/utils/i18nHelpers';

interface LocalizedTemplateSelectorProps {
  onTemplateSelect: (template: BusinessTemplate) => void;
  selectedTemplate?: BusinessTemplate | null;
}

/**
 * Enhanced Template Selector demonstrating Phase 5 challenges:
 * 1. Dynamic Content: Localized template names and descriptions
 * 2. Pluralization: Section counts with proper plural forms
 * 3. Context: Industry-specific translations
 * 4. Validation: Localized validation messages
 */
export default function LocalizedTemplateSelector({ 
  onTemplateSelect, 
  selectedTemplate 
}: LocalizedTemplateSelectorProps) {
  const { t } = useTranslation();
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const iconMap = {
    Utensils,
    Briefcase,
    ShoppingCart,
    Heart,
    Cog
  };

  const handleTemplateSelect = (template: BusinessTemplate) => {
    onTemplateSelect(template);
  };

  const toggleTemplateDetails = (templateId: string) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
  };

  const getSectionCount = (sections: string[]) => {
    // Challenge 2: Pluralization
    return I18nHelpers.pluralize('plurals.section', sections.length);
  };

  const getLocalizedSectionName = (sectionId: string) => {
    // Challenge 1: Dynamic content localization
    return I18nHelpers.getLocalizedSection(sectionId).name;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t('onboarding.templateSelection.title')}</h2>
        <p className="text-muted-foreground">
          {t('onboarding.templateSelection.description')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BUSINESS_TEMPLATES.map((template) => {
          const IconComponent = iconMap[template.icon as keyof typeof iconMap];
          const isSelected = selectedTemplate?.id === template.id;
          const isExpanded = expandedTemplate === template.id;
          
          // Challenge 1: Get localized template content
          const localizedTemplate = I18nHelpers.getLocalizedTemplate(template.id);

          return (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTemplateDetails(template.id);
                    }}
                  >
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} 
                    />
                  </Button>
                </div>
                
                <div>
                  <CardTitle className="text-lg">
                    {localizedTemplate.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {localizedTemplate.description}
                  </CardDescription>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {/* Challenge 3: Context-aware industry translation */}
                    {I18nHelpers.getContextualTranslation('industries', template.industry, template.industry)}
                  </span>
                  <span>
                    {getSectionCount(template.sections)}
                  </span>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">{t('common.sections')}</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.sections.slice(0, 6).map((sectionId) => (
                          <Badge key={sectionId} variant="secondary" className="text-xs">
                            {getLocalizedSectionName(sectionId)}
                          </Badge>
                        ))}
                        {template.sections.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.sections.length - 6} {t('common.more')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">{t('common.defaultRoles')}</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.defaultRoles.slice(0, 4).map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {/* Challenge 3: Context-aware role translation */}
                            {I18nHelpers.getContextualTranslation('roles', role, role)}
                          </Badge>
                        ))}
                        {template.defaultRoles.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.defaultRoles.length - 4} {t('common.more')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Challenge 4: Validation feedback */}
      {!selectedTemplate && (
        <div className="text-center text-sm text-muted-foreground">
          {I18nHelpers.getValidationError('template', 'required')}
        </div>
      )}
    </div>
  );
}