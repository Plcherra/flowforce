import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal, GoalStatus } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';

export interface GoalFormValues {
  title: string;
  description?: string;
  status: GoalStatus;
  priority: string;
  dueDate: Date | null;
  progress: number;
}

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  saving?: boolean;
  initialGoal?: Goal | null;
  aiSuggestion?: { title: string; description: string } | null;
}

const defaultForm: GoalFormValues = {
  title: '',
  description: '',
  status: 'active',
  priority: 'medium',
  dueDate: null,
  progress: 0,
};

export function CreateGoalModal({
  open,
  onOpenChange,
  onSubmit,
  saving,
  initialGoal,
  aiSuggestion,
}: CreateGoalModalProps) {
  const { profile } = useProfile();
  const [values, setValues] = useState<GoalFormValues>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initialGoal) {
        setValues({
          title: initialGoal.title ?? '',
          description: initialGoal.description ?? '',
          status: (initialGoal.status as GoalStatus) ?? 'active',
          priority: initialGoal.priority ?? 'medium',
          dueDate: initialGoal.target_completion_date
            ? new Date(initialGoal.target_completion_date)
            : null,
          progress: initialGoal.progress ?? 0,
        });
      } else if (aiSuggestion) {
        setValues({
          ...defaultForm,
          title: aiSuggestion.title,
          description: aiSuggestion.description,
        });
      } else {
        setValues(defaultForm);
      }
      setError(null);
    }
  }, [open, initialGoal, aiSuggestion]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.title.trim()) {
      setError('A title is required');
      return;
    }

    if (Number.isNaN(values.progress) || values.progress < 0 || values.progress > 100) {
      setError('Progress must be between 0 and 100');
      return;
    }

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        description: values.description?.trim(),
      });
      setValues(defaultForm);
      setError(null);
      onOpenChange(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to save goal';
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg space-y-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold">
            {initialGoal ? 'Edit Goal' : 'Create Goal'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Outline objectives, set expectations, and keep momentum visible to the entire team.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={values.title}
              placeholder="Launch onboarding checklist for retail team"
              onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              value={values.description}
              placeholder="Describe what success looks like, the why behind the goal, or key milestones."
              rows={4}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(status: GoalStatus) =>
                  setValues((prev) => ({ ...prev, status }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={values.priority}
                onValueChange={(priority) =>
                  setValues((prev) => ({ ...prev, priority }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !values.dueDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {values.dueDate ? format(values.dueDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={values.dueDate ?? undefined}
                    onSelect={(date) =>
                      setValues((prev) => ({ ...prev, dueDate: date ?? null }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress %</Label>
              <Input
                id="progress"
                type="number"
                min={0}
                max={100}
                value={values.progress}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    progress: Number.isNaN(Number(event.target.value))
                      ? prev.progress
                      : Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-md border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="font-medium text-foreground">
                  Owner
                </p>
                <p>{profile?.firstName ?? profile?.first_name ?? 'Your profile'}</p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : initialGoal ? 'Save changes' : 'Create goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
