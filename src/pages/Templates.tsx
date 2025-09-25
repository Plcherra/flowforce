
import { useParams } from 'react-router-dom';
import { templates, TemplateKey } from '@/data/templateData';
import { TemplateDetail } from '@/components/templates/TemplateDetail';
import { TemplatesOverview } from '@/components/templates/TemplatesOverview';

export default function Templates() {
  const { templateId } = useParams<{ templateId: string }>();
  const selectedTemplate = templateId ? templates[templateId as TemplateKey] : null;

  if (selectedTemplate && templateId) {
    return (
      <TemplateDetail 
        templateId={templateId as TemplateKey} 
        template={selectedTemplate} 
      />
    );
  }

  return <TemplatesOverview />;
}
