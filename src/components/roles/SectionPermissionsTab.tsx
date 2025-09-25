import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

type Role = 'staff' | 'supervisor' | 'manager' | 'admin' | 'owner';

const roles: Role[] = ['staff', 'supervisor', 'manager', 'admin', 'owner'];
const caps = [
  { key: 'view', label: 'View sections' },
  { key: 'edit', label: 'Add/Edit/Delete pages' },
  { key: 'create', label: 'Create new sections' },
];

export default function SectionPermissionsTab() {
  const [state, setState] = useState<Record<Role, Record<string, boolean>>>(() => {
    const base: any = {};
    roles.forEach(r => {
      base[r] = { view: r !== 'staff', edit: r === 'manager' || r === 'admin' || r === 'owner', create: r === 'admin' || r === 'owner' };
    });
    base.owner = { view: true, edit: true, create: true };
    return base;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Role</th>
                {caps.map(c => (<th key={c.key} className="text-left p-2">{c.label}</th>))}
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role} className="border-t">
                  <td className="p-2 capitalize">
                    <Badge>{role}</Badge>
                  </td>
                  {caps.map(c => (
                    <td key={c.key} className="p-2">
                      <Checkbox
                        checked={!!state[role][c.key]}
                        disabled={role === 'owner'}
                        onCheckedChange={(v) => setState(prev => ({ ...prev, [role]: { ...prev[role], [c.key]: !!v } }))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Owner has all permissions by default and cannot be modified.</p>
      </CardContent>
    </Card>
  );
}

