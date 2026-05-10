import { Navigate, useParams } from "@/lib/router-adapter";
import { TemplateDetail } from "@/features/templates/components/TemplateDetail";
import { templates, type TemplateKey } from "@/data/templateData";

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();

  if (!templateId || !(templateId in templates)) {
    return <Navigate to="/templates" replace />;
  }

  const template = templates[templateId as keyof typeof templates];

  return <TemplateDetail templateId={templateId as TemplateKey} template={template} />;
}
