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
    { label: "API Documentation" },
  ];

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/employees",
      description: "Retrieve all employees",
      auth: "Required",
    },
    {
      method: "POST",
      path: "/api/v1/schedules",
      description: "Create a new schedule",
      auth: "Required",
    },
    {
      method: "PUT",
      path: "/api/v1/tasks/{id}",
      description: "Update a specific task",
      auth: "Required",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumbs items={breadcrumbItems} />
          <BackButton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Code className="h-6 w-6 text-purple-600 mr-3" />
                <div>
                  <CardTitle className="text-2xl">API Documentation</CardTitle>
                  <CardDescription className="mt-2">
                    Complete reference for our REST API
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Reference</Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  30 min
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>Authentication</h3>
              <p>
                FlowForce API uses Bearer token authentication. Include your API
                token in the Authorization header:
              </p>
              <pre className="bg-gray-100 p-4 rounded-lg">
                <code>Authorization: Bearer YOUR_API_TOKEN</code>
              </pre>

              <h3>Base URL</h3>
              <p>All API requests should be made to:</p>
              <pre className="bg-gray-100 p-4 rounded-lg">
                <code>https://api.flowforce.com/v1</code>
              </pre>

              <h3>Common Endpoints</h3>
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
                    <p className="text-gray-600">{endpoint.description}</p>
                  </div>
                ))}
              </div>

              <h3>Rate Limits</h3>
              <p>
                API requests are limited to 1000 requests per hour per API
                token. Rate limit information is included in response headers.
              </p>

              <h3>Error Handling</h3>
              <p>
                The API returns standard HTTP status codes. Error responses
                include a JSON object with error details and suggestions for
                resolution.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
