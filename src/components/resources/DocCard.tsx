import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface DocCardProps {
  title: string;
  description: string;
  type: string;
  readTime: string;
  url: string;
}

export default function DocCard({
  title,
  description,
  type,
  readTime,
  url,
}: DocCardProps) {
  const { t } = useTranslation();

  // Map specific documentation titles to their dedicated routes
  const getDocumentationRoute = (title: string, url: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes("getting started")) {
      return "/resources/docs/getting-started";
    }
    if (titleLower.includes("api documentation")) {
      return "/resources/docs/api";
    }
    if (titleLower.includes("integration")) {
      return "/resources/docs/integrations";
    }
    if (titleLower.includes("user manual")) {
      return "/resources/docs/user-manual";
    }
    return url; // fallback to original URL
  };

  const documentationRoute = getDocumentationRoute(title, url);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            {type}
          </Badge>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            {readTime} {t("resources.details.readTime")}
          </div>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full group" asChild>
          <Link to={documentationRoute}>
            {t("resources.details.readMore")}
            <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
