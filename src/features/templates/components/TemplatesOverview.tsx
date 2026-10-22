import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "@/lib/router-adapter";
import { BackButton } from "@/components/ui/back-button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { templates } from "@/data/templateData";
import { TemplateCard } from "./TemplateCard";

export function TemplatesOverview() {
  const { t } = useTranslation();
  const _navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Back Button */}
        <div className="mb-4">
          <BackButton />
        </div>

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="hover:text-primary">
                  {t("onboarding.home")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("schedule.templates")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {t("onboarding.industryTemplates")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("landing.industries.subtitle")}
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {Object.entries(templates).map(([key, template]) => (
            <TemplateCard
              key={key}
              templateKey={key as keyof typeof templates}
              template={template}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
