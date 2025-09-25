import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type UsersTabProps = {
  employees: any[];
  employeesLoading: boolean;
  getEmployeesByPosition: (positionId: string) => any[];
  getEmployeeFullName: (employee: any) => string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isUserAvailableForWindow: (userId: string) => boolean;
};

export function UsersTab({
  employees,
  employeesLoading,
  getEmployeesByPosition,
  getEmployeeFullName,
  formData,
  setFormData,
  isUserAvailableForWindow,
}: UsersTabProps) {
  const [userViews, setUserViews] = useState<{ time: boolean; qualified: boolean }>({ time: true, qualified: false });

  const filteredCandidates = () => {
    let list = employees.slice();
    if (userViews.qualified) {
      list = formData.job_position_id ? getEmployeesByPosition(formData.job_position_id) : [];
    }
    if (userViews.time) {
      list = list.filter((emp) => isUserAvailableForWindow(emp.id));
    }
    if (!userViews.time && !userViews.qualified) {
      list = employees.slice();
    }
    return list.filter((emp) => !formData.assigned_users.includes(emp.id));
  };

  const noCandidates = filteredCandidates().length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Visualization</div>
        <div className="inline-flex gap-1">
          <Button
            type="button"
            variant={userViews.time ? 'default' : 'ghost'}
            size="sm"
            className="h-8"
            onClick={() => setUserViews((v) => ({ ...v, time: !v.time }))}
          >
            By Time
          </Button>
          <Button
            type="button"
            variant={userViews.qualified ? 'default' : 'ghost'}
            size="sm"
            className="h-8"
            onClick={() => setUserViews((v) => ({ ...v, qualified: !v.qualified }))}
          >
            Qualified
          </Button>
        </div>
      </div>

      <div>
        <Label>Select Users</Label>
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Users</span>
                {employeesLoading && <span className="text-sm text-muted-foreground">Loading...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-40 overflow-y-auto">
              {!employeesLoading && (
                <div className="space-y-2">
                  {filteredCandidates().map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {employee.first_name[0]}
                            {employee.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getEmployeeFullName(employee)}</p>
                          <p className="text-xs text-muted-foreground">{employee.position?.name || employee.role}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFormData((prev: any) => ({ ...prev, assigned_users: [...prev.assigned_users, employee.id] }));
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {noCandidates && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {userViews.qualified && !formData.job_position_id
                        ? 'Pick a position to see qualified users'
                        : userViews.time
                        ? 'No available users for this time window'
                        : 'No users found'}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {formData.assigned_users.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selected Users ({formData.assigned_users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formData.assigned_users.map((userId: string) => {
                    const employee = employees.find((emp) => emp.id === userId);
                    if (!employee) return null;
                    return (
                      <div key={userId} className="flex items-center justify-between p-2 border rounded-lg bg-blue-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {employee.first_name[0]}
                              {employee.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{getEmployeeFullName(employee)}</p>
                            <p className="text-xs text-muted-foreground">{employee.position?.name || employee.role}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setFormData((prev: any) => ({
                              ...prev,
                              assigned_users: prev.assigned_users.filter((id: string) => id !== userId),
                            }))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

