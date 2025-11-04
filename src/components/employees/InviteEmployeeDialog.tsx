import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useInvites } from '@/hooks/useInvites';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { toast } from 'sonner';

type InviteEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type InviteFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

const DEFAULT_FORM: InviteFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'staff',
};

export function InviteEmployeeDialog({ open, onOpenChange, onSuccess }: InviteEmployeeDialogProps) {
  const [form, setForm] = useState<InviteFormState>(DEFAULT_FORM);
  const { sendInvite, isSending } = useInvites();
  const { roles, isLoading } = useTeamManagement();

  const roleOptions = useMemo(() => {
    if (!roles.length) {
      return [
        { id: 'staff', name: 'Staff' },
        { id: 'manager', name: 'Manager' },
        { id: 'supervisor', name: 'Supervisor' },
      ];
    }
    return roles.map((role) => ({ id: role.id, name: role.name }));
  }, [roles]);

  useEffect(() => {
    if (!open) {
      setForm(DEFAULT_FORM);
    }
  }, [open]);

  useEffect(() => {
    if (!roleOptions.length) return;
    const firstRole = roleOptions[0];
    setForm((prev) => ({
      ...prev,
      role: prev.role ?? firstRole.id,
    }));
  }, [roleOptions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.email) {
      toast.error('An email address is required.');
      return;
    }
    const result = await sendInvite({
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
    });

    if (result.success) {
      toast.success('Invitation sent');
      onOpenChange(false);
      onSuccess?.();
      setForm(DEFAULT_FORM);
      return;
    }

    toast.error(result.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-first-name">First name</Label>
              <Input
                id="invite-first-name"
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                placeholder="Taylor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-last-name">Last name</Label>
              <Input
                id="invite-last-name"
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                placeholder="Rivera"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="taylor@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
