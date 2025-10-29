import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Target, Award, CheckSquare, AlertCircle, Clock, Star, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { TaskForm, type Task } from './TaskForm';
import { useAuth } from '@/hooks/useAuth';
import { useEmployees } from '@/hooks/useEmployees';

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function CreateGoalDialog({ open, onOpenChange }: CreateGoalDialogProps) {
  const { createGoal, linkTaskToGoal } = useGoals();
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetDate, setTargetDate] = useState<Date>();
  const [rewardType, setRewardType] = useState<'recognition' | 'bonus' | 'badge' | 'time_off' | 'custom'>('recognition');
  const [rewardDetails, setRewardDetails] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([
    { title: '', description: '', priority: 'medium' },
    { title: '', description: '', priority: 'medium' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setOwnerId((current) => current || user.id);
    }
  }, [open, user]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'low': return 'bg-success/10 text-success-foreground border-success/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'recognition': return <Star className="h-4 w-4" />;
      case 'badge': return <Award className="h-4 w-4" />;
      case 'bonus': return <Gift className="h-4 w-4" />;
      case 'time_off': return <Clock className="h-4 w-4" />;
      case 'custom': return <Target className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };


  const isFormValid = () => {
    return title.trim() && 
           ownerId &&
           tasks.length >= 2 && 
           tasks.every(task => task.title.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const ownerToUse = ownerId || user.id;

      const newGoal = await createGoal({
        ownerId: ownerToUse,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        target_completion_date: targetDate ? targetDate.toISOString().split('T')[0] : null,
        reward_type: rewardType,
        reward_details: rewardDetails ? { description: rewardDetails } : null,
        status: 'draft',
        progress: 0,
        completed_at: null
      });

      // Create and link tasks to the goal
      for (const task of tasks) {
        if (task.title.trim()) {
          const newTask = await createTask({
            title: task.title.trim(),
            description: task.description.trim() || '',
            priority: task.priority,
            status: 'todo',
            due_date: targetDate ? targetDate.toISOString() : null,
            assigned_to: ownerToUse,
            created_by: user.id,
            department_id: null,
            estimated_hours: null,
            actual_hours: null,
            tags: [],
            attachments: [],
            parent_task_id: null,
            workflow_id: null
          });

          if (newTask?.data && newGoal?.data) {
            await linkTaskToGoal(newGoal.data.id, newTask.data.id, null, 1);
          }
        }
      }

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setTargetDate(undefined);
      setRewardType('recognition');
      setRewardDetails('');
      setOwnerId(user?.id ?? '');
      setTasks([
        { title: '', description: '', priority: 'medium' },
        { title: '', description: '', priority: 'medium' }
      ]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">Create New Goal</DialogTitle>
          </div>
          <DialogDescription>
            Set up a goal with specific tasks to track progress and celebrate achievements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Goal Details</h3>
              </div>
              
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Goal Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Increase team productivity by 25%"
                className="font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what success looks like and why this goal matters..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-1">
                  {getPriorityIcon(priority)}
                  <span>Priority</span>
                </Label>
                <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="h-4 w-4 text-success" />
                        <span>Low Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-warning" />
                        <span>Medium Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span>High Priority</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className={cn("w-fit text-xs", getPriorityColor(priority))}>
                  {getPriorityIcon(priority)}
                  <span className="ml-1 capitalize">{priority} Priority</span>
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Goal Owner *</Label>
                <Select 
                  value={ownerId} 
                  onValueChange={setOwnerId}
                  disabled={loading || employeesLoading}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Target Completion</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-10',
                        !targetDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {targetDate ? format(targetDate, 'PPP') : 'Select target date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reward Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Reward & Recognition</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-1">
                  {getRewardIcon(rewardType)}
                  <span>Reward Type</span>
                </Label>
                <Select
                  value={rewardType}
                  onValueChange={(value: typeof rewardType) => setRewardType(value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recognition">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>Recognition & Praise</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="badge">
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span>Achievement Badge</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bonus">
                      <div className="flex items-center space-x-2">
                        <Gift className="h-4 w-4 text-green-500" />
                        <span>Monetary Bonus</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="time_off">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <span>Extra Time Off</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-gray-500" />
                        <span>Custom Reward</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward" className="text-sm font-medium">Reward Details</Label>
                <Textarea
                  id="reward"
                  value={rewardDetails}
                  onChange={(e) => setRewardDetails(e.target.value)}
                  placeholder="Describe the specific reward or recognition for achieving this goal..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tasks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Action Items</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {tasks.filter(t => t.title.trim()).length} of {tasks.length} tasks
              </Badge>
            </div>

            <TaskForm 
              tasks={tasks}
              onChange={setTasks}
              disabled={loading}
              minTasks={2}
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isFormValid()}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Create Goal</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
