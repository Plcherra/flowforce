import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/public-types';
import { useTeamManagement } from '@/hooks/useTeamManagement';

type Profile = Tables<'profiles'>;

type RoleManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Profile[];
  onRoleUpdated?: () => void;
};

export function RoleManagerDialog({
  open,
  onOpenChange,
  employees,
  onRoleUpdated,
}: RoleManagerDialogProps) {
  const { roles, isLoading, assignRole, isAssigning } = useTeamManagement();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`.trim() || employee.email,
      })),
    [employees],
  );

  useEffect(() => {
    if (!open) {
      setSelectedEmployeeId('');
      setSelectedRoleId('');
    }
  }, [open]);

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId || !selectedRoleId) return;

    await assignRole({ userId: selectedEmployeeId, roleId: selectedRoleId });
    onRoleUpdated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Update team roles</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleAssign}>
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teammate" />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={isLoading && !roles.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
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
            <Button type="submit" disabled={!selectedEmployeeId || !selectedRoleId || isAssigning}>
              {isAssigning ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
