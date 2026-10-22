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
import { Book, Clock, ChevronRight } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function UserManual() {
  const { t } = useTranslation();

  const breadcrumbItems = [
    { label: t("landing.resources"), href: "/resources" },
    { label: t("resources.documentation.title"), href: "/resources" },
    { label: t("resources.userManual") },
  ];

  const sections = [
    {
      title: t("resources.dashboardOverview"),
      description: t("resources.dashboardOverviewDescription"),
      pages: 5,
    },
    {
      title: t("features.employeeManagement.title"),
      description: t("resources.employeeProfilesDescription"),
      pages: 8,
    },
    {
      title: t("common.scheduling"),
      description: t("resources.schedulingGuideDescription"),
      pages: 12,
    },
    {
      title: t("features.taskManagement.title"),
      description: t("resources.taskWorkflowsDescription"),
      pages: 7,
    },
    {
      title: t("resources.formsAndDocuments"),
      description: t("resources.formsAndDocumentsDescription"),
      pages: 6,
    },
    {
      title: t("resources.reportingAndAnalytics"),
      description: t("resources.reportingAndAnalyticsDescription"),
      pages: 9,
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
                <Book className="h-6 w-6 text-warning mr-3" />
                <div>
                  <CardTitle className="text-2xl">{t("resources.userManual")}</CardTitle>
                  <CardDescription className="mt-2">
                    {t("resources.comprehensiveGuideToAllFlowforceFeatures")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{t("resources.manual")}</Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {t("resources.n45Min")}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>{t("resources.tableOfContents")}</h3>
              <p>
                {t("resources.thisComprehensiveUserManualCoversAllAspectsOfUsingFlowforceClickOnAnySectionBelowToJumpToDetailedInstructionsAndExamples")}
              </p>

              <div className="space-y-3 mt-6">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">
                            {section.title}
                          </h4>
                          <div className="flex items-center text-sm text-muted-foreground">
                            {t("resources.pageCount", { count: section.pages })}
                          </div>
                        </div>
                        <p className="text-muted-foreground">{section.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-8">{t("resources.quickStart")}</h3>
              <p>{t("resources.newToFlowforceStartWithTheseEssentialSections")}</p>
              <ul>
                <li>
                  <strong>{t("resources.dashboardOverview")}</strong> {t("resources.getFamiliarWithTheInterface")}
                </li>
                <li>
                  <strong>{t("features.employeeManagement.title")}</strong> {t("resources.setUpYourTeam")}
                </li>
                <li>
                  <strong>{t("common.scheduling")}</strong> {t("resources.createYourFirstSchedule")}
                </li>
              </ul>

              <h3>{t("resources.advancedFeatures")}</h3>
              <p>{t("resources.onceComfortable")}</p>
              <ul>
                <li>{t("resources.automatedWorkflowsAndTaskDependencies")}</li>
                <li>{t("resources.customFormBuilderAndDigitalSignatures")}</li>
                <li>{t("resources.advancedReportingAndDataAnalytics")}</li>
                <li>{t("resources.apiIntegrationsAndCustomWebhooks")}</li>
              </ul>

              <h3>{t("resources.needHelp")}</h3>
              <p>{t("resources.cantFindResources")}</p>
              <ul>
                <li>{t("resources.gettingStartedGuideForQuickSetup")}</li>
                <li>{t("resources.apiDocumentationForDevelopers")}</li>
                <li>{t("resources.integrationGuidesForConnectingOtherTools")}</li>
                <li>{t("resources.communityForumForUserDiscussions")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
