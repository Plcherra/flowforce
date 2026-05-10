import { useTranslation } from "react-i18next";
import Breadcrumbs from "@/features/resources/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, BookOpen } from "lucide-react";

export default function DocumentationDetail() {
  const { t } = useTranslation();

  const doc = {
    id: 1,
    title: "API Documentation",
    description:
      "Complete guide to FlowForce API endpoints and authentication.",
    content: "This is the full documentation content...",
    lastUpdated: "2024-01-20",
    readTime: "10 min read",
    category: "Developer Guide",
    version: "v2.1",
  };

  if (!doc) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t("resources.documentation.title")} {t("resources.details.notFound")}
        </h1>
        <p className="text-gray-600">
          {t("resources.details.requestedNotFound", {
            type: t("resources.documentation.title").toLowerCase(),
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumbs
        items={[
          { label: t("resources.title"), href: "/resources" },
          {
            label: t("resources.documentation.title"),
            href: "/resources/documentation",
          },
          { label: doc.title },
        ]}
      />

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">{doc.category}</Badge>
            <div className="flex items-center text-sm text-gray-600 space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>{doc.version}</span>
            </div>
          </div>
          <CardTitle className="text-3xl mb-4">{doc.title}</CardTitle>
          <p className="text-gray-600 mb-4">{doc.description}</p>
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-1" />
              {t("resources.details.lastUpdated")}:{" "}
              {new Date(doc.lastUpdated).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {doc.readTime}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p>{doc.content}</p>
            <p className="mt-4 text-gray-600">
              This is a placeholder for the actual documentation content. The
              full documentation would be loaded here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
