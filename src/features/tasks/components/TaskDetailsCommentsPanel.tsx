import { format } from "date-fns";
import { MessageSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentsSkeleton } from "@/components/loading/TaskSkeletons";
import { TaskCommentBody } from "@/features/tasks/components/TaskCommentBody";
import type { TaskCommentWithUser } from "@/features/tasks/hooks/useTaskComments";
import type { TaskContentTranslation } from "@/features/tasks/taskContentFields";

type TaskDetailsCommentsPanelProps = {
  comments: TaskCommentWithUser[];
  loadingComments: boolean;
  commentsError: string | null;
  addingComment: boolean;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
  onRetry: () => void;
  commentTranslations: Map<string, TaskContentTranslation | null>;
};

export function TaskDetailsCommentsPanel({
  comments,
  loadingComments,
  commentsError,
  addingComment,
  newComment,
  onNewCommentChange,
  onAddComment,
  onRetry,
  commentTranslations,
}: TaskDetailsCommentsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t("tasks.comments")}</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder={t("tasks.addAComment")}
          value={newComment}
          onChange={(event) => onNewCommentChange(event.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            onClick={onAddComment}
            disabled={!newComment.trim() || addingComment}
            size="sm"
          >
            <Send className="mr-2 h-4 w-4" />
            {addingComment ? t("tasks.adding") : t("tasks.addComment")}
          </Button>
        </div>
      </div>

      <div className="space-y-3" data-testid="task-details-comments">
        {loadingComments ? (
          <CommentsSkeleton />
        ) : commentsError ? (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-center text-sm"
            data-testid="task-details-comments-error"
          >
            <p className="text-destructive">{commentsError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-11"
              data-testid="task-details-comments-retry"
              onClick={onRetry}
            >
              {t("tasks.commentsRetry")}
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <div
            className="py-6 text-center text-sm text-muted-foreground"
            data-testid="task-details-comments-empty"
          >
            {t("tasks.noCommentsYet")}
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {comment.user?.first_name} {comment.user?.last_name}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM dd, yyyy HH:mm")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <TaskCommentBody
                  comment={comment.comment}
                  translation={commentTranslations.get(comment.id) ?? null}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}