import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  MessageCircle,
  Eye,
  Pin,
  Calendar,
  Bell,
  Newspaper,
  FileText,
  Globe,
} from "lucide-react";
import { CompanyUpdate, UpdateComment } from "@/types/companyUpdates";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommentForm } from "@/features/company-updates/hooks/useCommentForm";

interface UpdatesFeedViewProps {
  updates: CompanyUpdate[];
  comments: UpdateComment[];
  onLike?: (updateId: string) => void;
  onComment?: (updateId: string, content: string) => Promise<void> | void;
  onView?: (updateId: string) => void;
  loading?: boolean;
}

export function UpdatesFeedView({
  updates,
  comments,
  onLike,
  onComment,
  onView,
  loading = false,
}: UpdatesFeedViewProps) {
  const { t } = useTranslation();
  const {
    values: commentInputs,
    errors: commentErrors,
    handleChange: handleCommentInputChange,
    clearComment,
    setError: setCommentError,
  } = useCommentForm();
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!onView) {
      return;
    }

    const observers: IntersectionObserver[] = [];

    updates.forEach((update) => {
      if (update.viewerHasViewed) {
        return;
      }

      const node = cardRefs.current[update.id];
      if (!node) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            onView(update.id);
            obs.disconnect();
          }
        },
        { threshold: 0.35 },
      );

      observer.observe(node);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [updates, onView]);

  const getUpdateIcon = (type: CompanyUpdate["type"]) => {
    switch (type) {
      case "announcement":
        return <Bell className="h-5 w-5" />;
      case "news":
        return <Newspaper className="h-5 w-5" />;
      case "event":
        return <Calendar className="h-5 w-5" />;
      case "policy":
        return <FileText className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: CompanyUpdate["type"]) => {
    switch (type) {
      case "announcement":
        return "text-primary bg-primary/10";
      case "news":
        return "text-success bg-success-muted";
      case "event":
        return "text-secondary bg-secondary/10";
      case "policy":
        return "text-warning bg-warning-muted";
      default:
        return "text-muted-foreground bg-background";
    }
  };

  const handleLike = (updateId: string) => {
    onLike?.(updateId);
  };

  const handleComment = async (updateId: string) => {
    const content = commentInputs[updateId];
    if (!content?.trim()) {
      return;
    }

    try {
      await Promise.resolve(onComment?.(updateId, content));
      clearComment(updateId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to post comment.";
      setCommentError(updateId, message);
    }
  };

  const toggleComments = (updateId: string) => {
    setShowComments((prev) => ({ ...prev, [updateId]: !prev[updateId] }));
  };

  const getUpdateComments = (updateId: string) => {
    return comments.filter((comment) => comment.updateId === updateId);
  };

  // Sort updates by pinned first, then by publish date
  const sortedUpdates = [...updates]
    .filter((update) => update.status === "published")
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
    });

  if (loading) {
    return <UpdatesFeedSkeleton />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {sortedUpdates.map((update) => {
        const updateComments = getUpdateComments(update.id);
        const isLiked = Boolean(update.viewerHasLiked);

        return (
          <Card
            key={update.id}
            ref={(el) => {
              if (el) {
                cardRefs.current[update.id] = el;
              } else {
                delete cardRefs.current[update.id];
              }
            }}
            className={`${update.isPinned ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={update.author.avatar} />
                    <AvatarFallback>
                      {update.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{update.author.name}</h3>
                      {update.author.role && (
                        <Badge variant="outline" className="text-xs">
                          {update.author.role}
                        </Badge>
                      )}
                      {update.isPinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(update.publishDate), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>•</span>
                      <div
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full ${getTypeColor(update.type)}`}
                      >
                        {getUpdateIcon(update.type)}
                        <span className="text-xs font-medium capitalize">
                          {update.type}
                        </span>
                      </div>
                      <Globe className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">{update.title}</h2>
                  {update.richContent ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: update.richContent }}
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed">
                      {update.body}
                    </p>
                  )}
                </div>

                {/* Engagement Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{update.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{update.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{update.comments}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(update.id)}
                    className={isLiked ? "text-destructive hover:text-destructive/80" : ""}
                  >
                    <Heart
                      className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`}
                    />
                    {t("updates.like")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(update.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t("updates.comment")}
                  </Button>
                </div>

                {/* Comments Section */}
                {showComments[update.id] && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    {/* Comment Input */}
                    <div className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{t("schedule.you")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder={t("updates.writeAComment")}
                          value={commentInputs[update.id] || ""}
                          onChange={(e) =>
                            handleCommentInputChange(update.id, e.target.value)
                          }
                          className="min-h-[60px] resize-none"
                          aria-invalid={Boolean(commentErrors[update.id])}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleComment(update.id)}
                            disabled={!commentInputs[update.id]?.trim()}
                          >
                            {t("updates.comment")}
                          </Button>
                        </div>
                        {commentErrors[update.id] && (
                          <p className="text-xs text-destructive" role="alert">
                            {commentErrors[update.id]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Existing Comments */}
                    {updateComments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.avatar} />
                          <AvatarFallback>
                            {comment.author.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted/50 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">
                                {comment.author.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(comment.createdAt),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              {comment.likes}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {sortedUpdates.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-muted/50 rounded-lg inline-block mb-4">
            <span className="text-2xl">📢</span>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("sections.noUpdatesYet2")}
          </h3>
          <p className="text-muted-foreground">
            {t("sections.companyUpdatesAndAnnouncementsWillAppearHere")}
          </p>
        </div>
      )}
    </div>
  );
}

function UpdatesFeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
