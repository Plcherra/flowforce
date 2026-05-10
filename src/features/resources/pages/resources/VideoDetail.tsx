import { useTranslation } from "react-i18next";
import Breadcrumbs from "@/features/resources/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, User } from "lucide-react";

export default function VideoDetail() {
  const { t } = useTranslation();

  const video = {
    id: 1,
    title: "FlowForce Dashboard Overview",
    description:
      "Learn how to navigate and use the FlowForce dashboard effectively.",
    duration: "8:45",
    instructor: "Michael Chen",
    publishDate: "2024-01-18",
    thumbnailUrl: "/api/placeholder/640/360",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "Tutorial",
  };

  if (!video) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t("resources.videos.title")} {t("resources.details.notFound")}
        </h1>
        <p className="text-gray-600">
          {t("resources.details.requestedNotFound", { type: "video" })}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumbs
        items={[
          { label: t("resources.title"), href: "/resources" },
          { label: t("resources.videos.title"), href: "/resources/videos" },
          { label: video.title },
        ]}
      />

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary">{video.category}</Badge>
            <div className="flex items-center text-sm text-gray-600">
              <User className="h-4 w-4 mr-1" />
              {video.instructor}
            </div>
          </div>
          <CardTitle className="text-3xl mb-4">{video.title}</CardTitle>
          <p className="text-gray-600 mb-4">{video.description}</p>
        </CardHeader>
        <CardContent>
          <div className="aspect-video mb-6 bg-gray-100 rounded-lg overflow-hidden">
            {video.embedUrl ? (
              <iframe
                src={video.embedUrl}
                title={video.title}
                className="w-full h-full rounded-lg"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Play className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {t("resources.details.duration")}: {video.duration}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
