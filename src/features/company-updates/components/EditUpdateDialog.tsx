import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useCompanyUpdateMutations } from '@/features/company-updates/hooks/useCompanyUpdateMutations';
import { RichTextEditor } from '@/features/company-updates/wizard/RichTextEditor';
import type { CompanyUpdate } from '@/types/companyUpdates';
import { Loader2 } from 'lucide-react';

interface EditUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  update: CompanyUpdate | null;
  onUpdateComplete?: () => void;
}

export function EditUpdateDialog({ open, onOpenChange, update, onUpdateComplete }: EditUpdateDialogProps) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const { updateUpdate } = useCompanyUpdateMutations();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    richContent: '',
    type: 'announcement' as CompanyUpdate['type'],
    priority: 'medium' as CompanyUpdate['priority'],
  });

  useEffect(() => {
    if (update && open) {
      setFormData({
        title: update.title,
        body: update.body,
        richContent: update.richContent ?? '',
        type: update.type,
        priority: update.priority,
      });
    }
  }, [update, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!update) return;

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await updateUpdate(update.id, {
        title: formData.title.trim(),
        body: formData.body.trim(),
        rich_content: formData.richContent || null,
        type: formData.type,
        priority: formData.priority,
      });

      toast({
        title: 'Update edited',
        description: 'Your changes have been saved successfully.',
      });

      onOpenChange(false);
      onUpdateComplete?.();
    } catch (error) {
      console.error('Failed to update:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!update) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company Update</DialogTitle>
          <DialogDescription>Make changes to your company update</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Update title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder="Update content"
              value={formData.body}
              onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="richContent">Rich Content (HTML)</Label>
            <RichTextEditor
              value={formData.richContent}
              onChange={(value) => setFormData((prev) => ({ ...prev, richContent: value }))}
              placeholder="Write your update content..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as CompanyUpdate['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value as CompanyUpdate['priority'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
