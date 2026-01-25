import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useTickets } from '@/hooks/useTickets';
import { useEmployees } from '@/hooks/useEmployees';
import type { HelpDeskTicket, HelpDeskTicketStatus, HelpDeskTicketPriority } from '@/hooks/useTickets';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: HelpDeskTicket | null;
  onTicketUpdated?: () => void;
}

export function TicketDetailsDialog({ open, onOpenChange, ticket, onTicketUpdated }: TicketDetailsDialogProps) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const { updateTicket, updating } = useTickets({ companyId: profile?.companyId ?? profile?.company_id ?? null });
  const { employees } = useEmployees({ companyId: profile?.companyId ?? profile?.company_id ?? null });
  const [formData, setFormData] = useState({
    status: 'open' as HelpDeskTicketStatus,
    priority: 'medium' as HelpDeskTicketPriority,
    assignedTo: '',
  });

  useEffect(() => {
    if (ticket && open) {
      setFormData({
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo ?? '',
      });
    }
  }, [ticket, open]);

  const handleSave = async () => {
    if (!ticket) return;

    try {
      await updateTicket(ticket.id, {
        status: formData.status,
        priority: formData.priority,
        assigned_to: formData.assignedTo || null,
      });

      toast({
        title: 'Ticket updated',
        description: 'Changes have been saved successfully.',
      });

      onTicketUpdated?.();
    } catch (error) {
      logger.error('Failed to update ticket', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update ticket. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!ticket) return null;

  const assignedEmployee = employees.find((e) => e.id === ticket.assignedTo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{ticket.subject}</DialogTitle>
          <DialogDescription>
            Created {format(new Date(ticket.createdAt), 'MMM dd, yyyy at h:mm a')}
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <> • Updated {format(new Date(ticket.updatedAt), 'MMM dd, yyyy at h:mm a')}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              {ticket.description || 'No description provided'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as HelpDeskTicketStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value as HelpDeskTicketPriority }))
                }
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign To</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, assignedTo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                    {employee.role && ` (${employee.role})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignedEmployee && (
              <p className="text-xs text-muted-foreground">
                Currently assigned to: {assignedEmployee.first_name} {assignedEmployee.last_name}
              </p>
            )}
          </div>

          {ticket.category && (
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="text-sm text-muted-foreground">{ticket.category}</div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
              Close
            </Button>
            <Button onClick={handleSave} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
