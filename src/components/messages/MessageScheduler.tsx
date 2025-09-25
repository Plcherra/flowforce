import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Send, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addMinutes, addHours, addDays } from 'date-fns';

interface ScheduledMessage {
  id: string;
  content: string;
  channelId: string;
  channelName: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Date;
}

interface MessageSchedulerProps {
  channelId: string;
  channelName: string;
  onScheduleMessage: (content: string, scheduledFor: Date) => void;
  children: React.ReactNode;
}

export function MessageScheduler({ 
  channelId, 
  channelName, 
  onScheduleMessage, 
  children 
}: MessageSchedulerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([
    {
      id: '1',
      content: 'Don\'t forget about tomorrow\'s team meeting at 10 AM!',
      channelId: 'channel-1',
      channelName: 'General',
      scheduledFor: addHours(new Date(), 2),
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: '2',
      content: 'Weekly report is due by end of day Friday',
      channelId: 'channel-1',
      channelName: 'General',
      scheduledFor: addDays(new Date(), 1),
      status: 'pending',
      createdAt: new Date()
    }
  ]);

  const handleSchedule = () => {
    if (!content.trim() || !scheduledFor || !scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduledFor}T${scheduledTime}`);
    
    if (scheduledDateTime <= new Date()) {
      toast({
        title: "Invalid Date",
        description: "Scheduled time must be in the future",
        variant: "destructive",
      });
      return;
    }

    const newMessage: ScheduledMessage = {
      id: Date.now().toString(),
      content,
      channelId,
      channelName,
      scheduledFor: scheduledDateTime,
      status: 'pending',
      createdAt: new Date()
    };

    setScheduledMessages(prev => [...prev, newMessage]);
    onScheduleMessage(content, scheduledDateTime);

    toast({
      title: "Message Scheduled",
      description: `Message will be sent on ${format(scheduledDateTime, 'MMM dd, yyyy at h:mm a')}`,
    });

    // Reset form
    setContent('');
    setScheduledFor('');
    setScheduledTime('');
    setIsOpen(false);
  };

  const cancelScheduledMessage = (messageId: string) => {
    setScheduledMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'cancelled' as const } : msg
      )
    );

    toast({
      title: "Message Cancelled",
      description: "Scheduled message has been cancelled",
    });
  };

  const getQuickScheduleOptions = () => {
    const now = new Date();
    return [
      { label: 'In 1 hour', date: addHours(now, 1) },
      { label: 'In 4 hours', date: addHours(now, 4) },
      { label: 'Tomorrow 9 AM', date: new Date(addDays(now, 1).setHours(9, 0, 0, 0)) },
      { label: 'Next Monday 9 AM', date: new Date(addDays(now, 7 - now.getDay() + 1).setHours(9, 0, 0, 0)) }
    ];
  };

  const setQuickSchedule = (date: Date) => {
    setScheduledFor(format(date, 'yyyy-MM-dd'));
    setScheduledTime(format(date, 'HH:mm'));
  };

  const pendingMessages = scheduledMessages.filter(msg => msg.status === 'pending');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Schedule Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                placeholder="Type your message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Schedule Options */}
            <div>
              <Label>Quick Schedule</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {getQuickScheduleOptions().map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickSchedule(option.date)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSchedule} className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Schedule Message
              </Button>
            </div>
          </div>

          {/* Scheduled Messages List */}
          {pendingMessages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Messages ({pendingMessages.length})
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {pendingMessages.map((message) => (
                  <Card key={message.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          #{message.channelName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {format(message.scheduledFor, 'MMM dd, h:mm a')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => cancelScheduledMessage(message.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>
                          Scheduled {format(message.createdAt, 'MMM dd, h:mm a')}
                        </span>
                        <span>
                          Sends in {format(new Date(message.scheduledFor.getTime() - new Date().getTime()), 'H:mm')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}