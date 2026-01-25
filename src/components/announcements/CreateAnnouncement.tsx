import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface CreateAnnouncementProps {
  open: boolean;
  onClose: () => void;
  onAnnouncementCreated?: () => void;
}

export function CreateAnnouncement({ open, onClose, onAnnouncementCreated }: CreateAnnouncementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_audience: 'all',
    is_published: true
  });
  const [expiresAt, setExpiresAt] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.content.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim(),
          priority: formData.priority,
          target_audience: formData.target_audience,
          is_published: formData.is_published,
          expires_at: expiresAt?.toISOString() || null,
          created_by: user.id,
          company_id: user.user_metadata?.company_id || '00000000-0000-0000-0000-000000000000' // Fallback
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement created successfully',
      });

      // Reset form
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        target_audience: 'all',
        is_published: true
      });
      setExpiresAt(undefined);

      onAnnouncementCreated?.();
      onClose();
    } catch (error) {
      logger.error('Error creating announcement:', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Announcement
          </DialogTitle>
          <DialogDescription>
            Create a new announcement to share important information with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title"
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your announcement content here..."
              rows={4}
              required
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="specific">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal rounded-xl"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : 'Select expiration date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            {expiresAt && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpiresAt(undefined)}
                className="text-muted-foreground"
              >
                Clear expiration date
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="published">Publish Immediately</Label>
              <p className="text-xs text-muted-foreground">
                Make this announcement visible to users right away
              </p>
            </div>
            <Switch
              id="published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim() || !formData.content.trim()}>
              {loading ? 'Creating...' : 'Create Announcement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}