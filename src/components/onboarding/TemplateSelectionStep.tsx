
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { BusinessTemplate } from '@/types/templates';
import TemplateSelector from '@/components/templates/TemplateSelector';
import { useTranslation } from 'react-i18next';

interface TemplateSelectionStepProps {
  selectedTemplate: BusinessTemplate | null;
  onTemplateSelect: (template: BusinessTemplate) => void;
}

export default function TemplateSelectionStep({ 
  selectedTemplate, 
  onTemplateSelect 
}: TemplateSelectionStepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center">
          <Building2 className="mr-2 h-6 w-6" />
          {t('onboarding.templateSelection.title')}
        </CardTitle>
        <CardDescription>
          {t('onboarding.templateSelection.description')}
        </CardDescription>
      </CardHeader>
      <TemplateSelector
        onTemplateSelect={onTemplateSelect}
        selectedTemplate={selectedTemplate?.id}
      />
    </div>
  );
}
