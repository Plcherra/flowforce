import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Breadcrumbs from "@/components/resources/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, Clock } from "lucide-react";

export default function BlogDetail() {
  const { id } = useParams();
  const { t } = useTranslation();

  const post = {
    id: 1,
    title: "Getting Started with FlowForce",
    excerpt: "A comprehensive guide to setting up your first operations suite.",
    content: "This is the full content of the blog post...",
    author: "Sarah Johnson",
    publishDate: "2024-01-15",
    readTime: "5 min read",
    tags: ["Tutorial", "Getting Started"],
  };

  if (!post) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t("resources.blog.title")} {t("resources.details.notFound")}
        </h1>
        <p className="text-gray-600">
          {t("resources.details.requestedNotFound", { type: "blog post" })}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumbs
        items={[
          { label: t("resources.title"), href: "/resources" },
          { label: t("resources.blog.title"), href: "/resources/blog" },
          { label: post.title },
        ]}
      />

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-3xl mb-4">{post.title}</CardTitle>
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-1" />
              {new Date(post.publishDate).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {post.readTime}
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {post.author} • {new Date(post.publishDate).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p>{post.content}</p>
            <p className="mt-4 text-gray-600">
              This is a placeholder for the actual blog post content. The full
              article would be displayed here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
