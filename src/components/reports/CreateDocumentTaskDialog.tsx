import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { DocumentWithRelations } from '@/types/ingestion';
import { logger } from '@/utils/logger';

interface CreateDocumentTaskDialogProps {
  document: DocumentWithRelations | null;
  open: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export function CreateDocumentTaskDialog({ document, open, onClose }: CreateDocumentTaskDialogProps) {
  const { user } = useAuth();
  const { createTask } = useTasks();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(undefined);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !document) return;

    setLoading(true);
    try {
      const links = [
        {
          type: 'document',
          documentId: document.id,
          storagePath: document.file?.storage_path ?? null,
        },
      ];

      const { error } = await createTask({
        title: title.trim() || `Follow up: ${document.title ?? document.file?.filename ?? 'Report'}`,
        description: description.trim() || null,
        priority: priority as any,
        created_by: user.id,
        due_date: dueDate ? dueDate.toISOString() : null,
        assigned_to: null,
        department_id: null,
        tags: null,
        attachments: [],
        parent_task_id: null,
        workflow_id: null,
        estimated_hours: null,
        actual_hours: null,
        source: 'from_report',
        origin_document_id: document.id,
        links,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Task created',
        description: 'The follow-up task is now in your task list.',
      });
      resetForm();
      onClose();
    } catch (err) {
      logger.error('Failed to create document task', { error: err, tags: ['error'] });
      const message = err instanceof Error ? err.message : 'Unable to create task.';
      toast({
        title: 'Task creation failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestedTitle = document
    ? `Follow up: ${document.title ?? document.file?.filename ?? 'Report'}`
    : 'Follow up task';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Follow-Up Task</DialogTitle>
          <DialogDescription>
            Convert report findings into a trackable action item for your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder={suggestedTitle}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Outline the follow-up steps or context for this task."
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !document}>
              {loading ? 'Creating…' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
