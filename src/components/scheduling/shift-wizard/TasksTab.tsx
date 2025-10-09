import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import type { ShiftTask } from './types';

type TasksTabProps = {
  tasks: ShiftTask[];
  onAddTask: (task: ShiftTask) => void;
  onRemoveTask: (taskId: string) => void;
};

export function TasksTab({ tasks, onAddTask, onRemoveTask }: TasksTabProps) {
  const [newTask, setNewTask] = useState<Pick<ShiftTask, 'title' | 'description' | 'priority' | 'estimated_minutes'>>({
    title: '',
    description: '',
    priority: 'medium',
    estimated_minutes: 30,
  });

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task: ShiftTask = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      estimated_minutes: newTask.estimated_minutes,
    };
    onAddTask(task);
    setNewTask({ title: '', description: '', priority: 'medium', estimated_minutes: 30 });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Shift Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
          <Textarea
            placeholder="Task description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            rows={2}
          />
          <div className="flex space-x-2">
            <Select
              value={newTask.priority}
              onValueChange={(value) =>
                setNewTask({ ...newTask, priority: value as ShiftTask['priority'] })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Minutes"
              className="w-24"
              value={newTask.estimated_minutes}
              onChange={(event) =>
                setNewTask({
                  ...newTask,
                  estimated_minutes: Number.parseInt(event.target.value, 10) || 0,
                })
              }
            />
            <Button type="button" onClick={addTask}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="pt-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{task.estimated_minutes}min</span>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveTask(task.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
