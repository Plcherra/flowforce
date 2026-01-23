import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { createTicket } from '@/repositories/ticketsRepository';
import type { HelpDeskTicketPriority } from '@/hooks/useTickets';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated?: () => void;
}

interface Department {
  id: string;
  name: string;
}

export function CreateTicketDialog({ open, onOpenChange, onTicketCreated }: CreateTicketDialogProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as HelpDeskTicketPriority,
    category: '',
    department_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  useEffect(() => {
    if (open && companyId) {
      fetchDepartments();
    }
  }, [open, companyId]);

  const fetchDepartments = async () => {
    if (!companyId) return;
    setDepartmentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;
      setDepartments(data ?? []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be signed in to create a ticket',
        variant: 'destructive',
      });
      return;
    }

    if (!companyId) {
      toast({
        title: 'Error',
        description: 'Company context is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await createTicket({
        subject: formData.subject.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        category: formData.category || null,
        department_id: formData.department_id || null,
        company_id: companyId,
        requester_id: user.id,
      });

      toast({
        title: 'Ticket created',
        description: 'Your support request has been submitted successfully.',
      });

      // Reset form
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: '',
        department_id: '',
      });
      setErrors({});
      onOpenChange(false);
      onTicketCreated?.();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Submit a support request. Our team will get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={formData.subject}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
              aria-invalid={Boolean(errors.subject)}
              required
            />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide more details about your issue..."
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleFieldChange('priority', value as HelpDeskTicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Technical, Billing, General"
                value={formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
              />
            </div>
          </div>

          {departments.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => handleFieldChange('department_id', value)}
                disabled={departmentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={departmentsLoading ? 'Loading...' : 'Select department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
