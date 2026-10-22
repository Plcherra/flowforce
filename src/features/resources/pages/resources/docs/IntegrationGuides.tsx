import { useTranslation } from "react-i18next";
import Breadcrumbs from "@/features/resources/components/Breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Clock } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/hooks/use-toast";
import { IntegrationCard } from "@/features/resources/components/integrations/IntegrationCard";
import { CustomIntegrationsSection } from "@/features/resources/components/integrations/CustomIntegrationsSection";
import { GettingStartedSection } from "@/features/resources/components/integrations/GettingStartedSection";
import { integrations } from "@/data/integrations";

export default function IntegrationGuides() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const breadcrumbItems = [
    { label: t("landing.resources"), href: "/resources" },
    { label: t("resources.documentation.title"), href: "/resources" },
    { label: t("resources.integrationGuides") },
  ];

  const handleStartIntegration = (integrationName: string) => {
    toast({
      title: t("resources.integrationStarted"),
      description: t("resources.integrationStartedDescription", {
        name: integrationName,
      }),
    });

    // Here you would typically redirect to the actual integration page or open a modal
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumbs items={breadcrumbItems} />
          <BackButton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Puzzle className="h-6 w-6 text-success mr-3" />
                <div>
                  <CardTitle className="text-2xl">{t("resources.integrationGuides")}</CardTitle>
                  <CardDescription className="mt-2">
                    {t("resources.connectFlowforceWithYourExistingTools")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{t("resources.tutorial")}</Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {t("resources.n15Min")}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>{t("resources.popularIntegrations")}</h3>
              <p>
                {t("resources.flowforceIntegratesSeamlesslyWithPopularBusinessToolsToStreamlineYourWorkflowChooseFromOurPreBuiltIntegrationsOrCreateCustomConnectionsUsingOurApi")}
              </p>

              <div className="space-y-8 mt-8">
                {integrations.map((integration, index) => (
                  <IntegrationCard
                    key={index}
                    integration={integration}
                    onStartIntegration={handleStartIntegration}
                  />
                ))}
              </div>

              <CustomIntegrationsSection />
              <GettingStartedSection />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
