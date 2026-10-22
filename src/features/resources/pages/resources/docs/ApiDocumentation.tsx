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
import { Code, Clock } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function ApiDocumentation() {
  const { t } = useTranslation();

  const breadcrumbItems = [
    { label: t("landing.resources"), href: "/resources" },
    { label: t("resources.documentation.title"), href: "/resources" },
    { label: t("resources.apiDocumentation") },
  ];

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/employees",
      description: t("resources.retrieveAllEmployees"),
      auth: t("forms.required"),
    },
    {
      method: "POST",
      path: "/api/v1/schedules",
      description: t("resources.createANewSchedule"),
      auth: t("forms.required"),
    },
    {
      method: "PUT",
      path: "/api/v1/tasks/{id}",
      description: t("resources.updateASpecificTask"),
      auth: t("forms.required"),
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
                <Code className="h-6 w-6 text-secondary mr-3" />
                <div>
                  <CardTitle className="text-2xl">{t("resources.apiDocumentation")}</CardTitle>
                  <CardDescription className="mt-2">
                    {t("resources.completeReferenceForOurRestApi")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{t("resources.reference")}</Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {t("resources.n30Min")}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>{t("resources.authentication")}</h3>
              <p>
                {t("resources.flowforceApiUsesBearerTokenAuthenticationIncludeYourApiTokenInTheAuthorizationHeader")}
              </p>
              <pre className="bg-muted p-4 rounded-lg">
                <code>{t("resources.authorizationBearerYourApiToken")}</code>
              </pre>

              <h3>{t("resources.baseUrl")}</h3>
              <p>{t("resources.allApiRequestsShouldBeMadeTo")}</p>
              <pre className="bg-muted p-4 rounded-lg">
                <code>https://api.flowforce.com/v1</code>
              </pre>

              <h3>{t("resources.commonEndpoints")}</h3>
              <div className="space-y-4 mt-4">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            endpoint.method === "GET"
                              ? "default"
                              : endpoint.method === "POST"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="font-mono text-sm">
                          {endpoint.path}
                        </code>
                      </div>
                      <Badge variant="outline">{endpoint.auth}</Badge>
                    </div>
                    <p className="text-muted-foreground">{endpoint.description}</p>
                  </div>
                ))}
              </div>

              <h3>{t("resources.rateLimits")}</h3>
              <p>
                {t("resources.apiRequestsAreLimitedTo1000RequestsPerHourPerApiTokenRateLimitInformationIsIncludedInResponseHeaders")}
              </p>

              <h3>{t("resources.errorHandling")}</h3>
              <p>
                {t("resources.theApiReturnsStandardHttpStatusCodesErrorResponsesIncludeAJsonObjectWithErrorDetailsAndSuggestionsForResolution")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
