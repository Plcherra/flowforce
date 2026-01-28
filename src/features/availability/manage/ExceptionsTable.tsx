import type { Dispatch, SetStateAction } from "react";

import dayjs from "dayjs";
import { Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-states";

import type { AvailabilityException } from "@/types/availability";
import type { AvailabilityEmployee, ExceptionFormState } from "./types";

interface ExceptionsTableProps {
  employees: AvailabilityEmployee[];
  exceptions: AvailabilityException[];
  form: ExceptionFormState;
  onFormChange: Dispatch<SetStateAction<ExceptionFormState>>;
  onSubmit: () => void;
  saving: boolean;
  isLoading: boolean;
}

export function ExceptionsTable({
  employees,
  exceptions,
  form,
  onFormChange,
  onSubmit,
  saving,
  isLoading,
}: ExceptionsTableProps) {
  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    label:
      `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() ||
      employee.email ||
      "Unknown",
  }));

  return (
    <Card className="border bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Per-person exceptions
        </CardTitle>
        <CardDescription>
          Allow individual employees to edit availability during locked periods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Employee</Label>
            <Select
              value={form.employeeId}
              onValueChange={(value) =>
                onFormChange((prev) => ({ ...prev, employeeId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    employeeOptions.length
                      ? "Select employee"
                      : "No employees found"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  onFormChange((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>End date</Label>
              <Input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(event) =>
                  onFormChange((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea
              placeholder="Why is this exception needed?"
              value={form.reason}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={saving || !form.employeeId}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save exception
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Existing exceptions
          </h3>
          {isLoading ? (
            <div className="py-4">
              <LoadingSpinner text="Loading exceptions..." />
            </div>
          ) : exceptions.length > 0 ? (
            <ScrollArea className="max-h-48 rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-left">Dates</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((exception) => (
                    <tr key={exception.id} className="border-t">
                      <td className="px-3 py-2">
                        {employeeOptions.find(
                          (option) => option.id === exception.employeeId,
                        )?.label ?? exception.employeeId}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {dayjs(exception.startDate).format("MMM D, YYYY")} –{" "}
                        {dayjs(exception.endDate).format("MMM D, YYYY")}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {exception.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <EmptyState
              title="No exceptions configured"
              description="Employees will follow lock settings unless you create a temporary exception."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-muted-foreground/50 bg-muted/10 px-6 py-8 text-center text-muted-foreground">
      <ShieldAlert className="h-5 w-5 text-muted-foreground/80" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs">{description}</p>
      </div>
    </div>
  );
}
