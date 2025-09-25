
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Flag, Clock, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/common';

interface TaskDetailsDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailsDialog({ task, open, onClose }: TaskDetailsDialogProps) {
  const { addComment, getTaskComments } = useTasks();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await getTaskComments(task.id);
      if (error) {
        console.error('Error fetching comments:', error);
      } else {
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setAddingComment(true);
    try {
      const { error } = await addComment(task.id, newComment);
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add comment. Please try again.',
          variant: 'destructive',
        });
      } else {
        setNewComment('');
        await fetchComments(); // Refresh comments
        toast({
          title: 'Success',
          description: 'Comment added successfully.',
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setAddingComment(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              {task.description && (
                <DialogDescription className="text-base">
                  {task.description}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              {task.assigned_profile && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span>{task.assigned_profile.first_name} {task.assigned_profile.last_name}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Priority:</span>
                <span className="capitalize">{task.priority}</span>
              </div>
              {task.estimated_hours && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Estimated:</span>
                  <span>{task.estimated_hours}h</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {task.due_date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due:</span>
                  <span>{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
              </div>
              {task.department && (
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Department:</span>
                  <span>{task.department.name}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Comments</h3>
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {addingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {loadingComments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No comments yet. Be the first to add one!
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
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm">{comment.comment}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
