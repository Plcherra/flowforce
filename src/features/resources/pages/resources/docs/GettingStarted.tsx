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
import { BookOpen, Clock, CheckCircle } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function GettingStarted() {
  const { t } = useTranslation();

  const breadcrumbItems = [
    { label: t("landing.resources"), href: "/resources" },
    { label: t("resources.documentation.title"), href: "/resources" },
    { label: t("resources.gettingStartedGuide") },
  ];

  const steps = [
    {
      title: t("resources.createYourAccount"),
      description: t("resources.createYourAccountDescription"),
      completed: true,
    },
    {
      title: t("resources.addYourTeam"),
      description: t("resources.addYourTeamDescription"),
      completed: false,
    },
    {
      title: t("resources.configureSettings"),
      description: t("resources.configureSettingsDescription"),
      completed: false,
    },
    {
      title: t("resources.createYourFirstScheduleStep"),
      description: t("resources.createYourFirstScheduleStepDescription"),
      completed: false,
    },
  ];

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
                <BookOpen className="h-6 w-6 text-primary mr-3" />
                <div>
                  <CardTitle className="text-2xl">
                    {t("resources.gettingStartedGuide")}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {t("resources.everythingYouNeedToSetUpFlowforceForYourTeam")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{t("resources.guide")}</Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {t("resources.n10Min")}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>{t("dashboard.welcomeToFlowforce")}</h3>
              <p>
                {t("resources.thisGuideWillWalkYouThroughTheEssentialStepsToGetYourTeamUpAndRunningWithFlowforceFollowTheseStepsInOrderToEnsureASmoothSetupProcess")}
              </p>

              <div className="space-y-4 mt-6">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle className="h-6 w-6 text-success" />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-border flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {step.title}
                      </h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-8">{t("resources.nextSteps")}</h3>
              <p>{t("resources.onceSetupComplete")}</p>
              <ul>
                <li>{t("resources.apiDocumentationForIntegrationGuidance")}</li>
                <li>{t("resources.userManualForDetailedFeatureExplanations")}</li>
                <li>{t("resources.integrationGuidesForConnectingWithOtherTools")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
