import { useParams } from 'react-router-dom';
import { TemplateDetail } from '@/components/templates/TemplateDetail';
import { templates } from '@/data/templateData';
import { Navigate } from 'react-router-dom';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  
  if (!templateId || !(templateId in templates)) {
    return <Navigate to="/templates" replace />;
  }
  
  const template = templates[templateId as keyof typeof templates];
  
  return <TemplateDetail templateId={templateId as any} template={template} />;
}