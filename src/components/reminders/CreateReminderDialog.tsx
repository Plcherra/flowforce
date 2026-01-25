import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Bell, Volume2, Mail, Smartphone, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { useReminders } from '@/hooks/useReminders';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/utils/logger';

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
}

export function CreateReminderDialog({ open, onOpenChange, taskId }: CreateReminderDialogProps) {
  const { createReminder } = useReminders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderInterval, setReminderInterval] = useState('custom');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'custom',
    priority: 'medium',
    sound_enabled: true,
    sound_type: 'default',
    notification_methods: ['in_app', 'browser'],
    repeat_enabled: false,
    repeat_interval: 'none',
    snooze_enabled: true,
    auto_complete: false
  });

  const calculateReminderDate = () => {
    if (reminderInterval === 'custom') return reminderDate;
    
    const now = new Date();
    const intervals = {
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '2hours': 2 * 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000,
      '2days': 2 * 24 * 60 * 60 * 1000,
      '1week': 7 * 24 * 60 * 60 * 1000
    };
    
    return new Date(now.getTime() + intervals[reminderInterval as keyof typeof intervals]);
  };

  const toggleNotificationMethod = (method: string) => {
    setFormData(prev => ({
      ...prev,
      notification_methods: prev.notification_methods.includes(method)
        ? prev.notification_methods.filter(m => m !== method)
        : [...prev.notification_methods, method]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReminderDate = calculateReminderDate();
    if (!formData.title.trim() || !finalReminderDate) return;

    setLoading(true);
    try {
      let finalDateTime = finalReminderDate;
      
      if (reminderInterval === 'custom' && reminderTime) {
        const [hours, minutes] = reminderTime.split(':').map(Number);
        finalDateTime = new Date(finalReminderDate);
        finalDateTime.setHours(hours, minutes, 0, 0);
      }

      await createReminder({
        title: formData.title,
        description: formData.description || null,
        remind_at: finalDateTime.toISOString(),
        type: formData.type,
        priority: formData.priority,
        task_id: taskId || null,
        sound_enabled: formData.sound_enabled,
        sound_type: formData.sound_type,
        notification_methods: formData.notification_methods,
        repeat_enabled: formData.repeat_enabled,
        repeat_interval: formData.repeat_interval,
        snooze_enabled: formData.snooze_enabled,
        auto_complete: formData.auto_complete,
        snooze_count: 0,
        last_triggered_at: null,
        next_reminder_at: null
      });

      toast({
        title: 'Success',
        description: 'Reminder created successfully.',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'custom',
        priority: 'medium',
        sound_enabled: true,
        sound_type: 'default',
        notification_methods: ['in_app', 'browser'],
        repeat_enabled: false,
        repeat_interval: 'none',
        snooze_enabled: true,
        auto_complete: false
      });
      setReminderDate(undefined);
      setReminderTime('09:00');
      setReminderInterval('custom');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error creating reminder:', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: 'Failed to create reminder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Reminder</DialogTitle>
          <DialogDescription>
            Set up a reminder to help you stay on track with your tasks and goals.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter reminder title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter reminder description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reminder Time</Label>
              <Select value={reminderInterval} onValueChange={setReminderInterval}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15min">15 minutes from now</SelectItem>
                  <SelectItem value="30min">30 minutes from now</SelectItem>
                  <SelectItem value="1hour">1 hour from now</SelectItem>
                  <SelectItem value="2hours">2 hours from now</SelectItem>
                  <SelectItem value="1day">1 day from now</SelectItem>
                  <SelectItem value="2days">2 days from now</SelectItem>
                  <SelectItem value="1week">1 week from now</SelectItem>
                  <SelectItem value="custom">Custom date & time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {reminderInterval === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reminder Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reminderDate ? format(reminderDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reminderDate}
                      onSelect={setReminderDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Reminder Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sound Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Sound & Notifications</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Enable Sound</Label>
                <p className="text-xs text-muted-foreground">Play sound when reminder triggers</p>
              </div>
              <Switch
                checked={formData.sound_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sound_enabled: checked }))}
              />
            </div>

            {formData.sound_enabled && (
              <div className="space-y-2">
                <Label htmlFor="sound-type">Sound Type</Label>
                <Select value={formData.sound_type} onValueChange={(value) => setFormData(prev => ({ ...prev, sound_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Notification</SelectItem>
                    <SelectItem value="chime">Soft Chime</SelectItem>
                    <SelectItem value="bell">Bell</SelectItem>
                    <SelectItem value="alert">Alert Tone</SelectItem>
                    <SelectItem value="gentle">Gentle Reminder</SelectItem>
                    <SelectItem value="urgent">Urgent Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notification Methods */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Notification Methods</Label>
            <p className="text-sm text-muted-foreground">Choose how you want to receive this reminder</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes('in_app') 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleNotificationMethod('in_app')}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-medium">In-App</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Show in notifications panel</p>
              </div>

              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes('browser') 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleNotificationMethod('browser')}
              >
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm font-medium">Browser Push</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Browser notification popup</p>
              </div>

              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes('email') 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleNotificationMethod('email')}
              >
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Send email reminder</p>
              </div>

              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes('mobile') 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleNotificationMethod('mobile')}
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm font-medium">Mobile Push</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mobile app notification</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {formData.notification_methods.map(method => (
                <Badge key={method} variant="secondary" className="text-xs">
                  {method === 'in_app' ? 'In-App' : 
                   method === 'browser' ? 'Browser' :
                   method === 'email' ? 'Email' : 'Mobile'}
                </Badge>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Advanced Options</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Repeat Reminder</Label>
                  <p className="text-xs text-muted-foreground">Repeat this reminder at intervals</p>
                </div>
                <Switch
                  checked={formData.repeat_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, repeat_enabled: checked }))}
                />
              </div>

              {formData.repeat_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="repeat-interval">Repeat Every</Label>
                  <Select value={formData.repeat_interval} onValueChange={(value) => setFormData(prev => ({ ...prev, repeat_interval: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5min">5 minutes</SelectItem>
                      <SelectItem value="15min">15 minutes</SelectItem>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Enable Snooze</Label>
                  <p className="text-xs text-muted-foreground">Allow snoozing this reminder</p>
                </div>
                <Switch
                  checked={formData.snooze_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, snooze_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto-Complete</Label>
                  <p className="text-xs text-muted-foreground">Mark as completed when task is done</p>
                </div>
                <Switch
                  checked={formData.auto_complete}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_complete: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim() || (reminderInterval === 'custom' && !reminderDate) || formData.notification_methods.length === 0}>
              {loading ? 'Creating...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}