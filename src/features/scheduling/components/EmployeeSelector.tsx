import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, Plus, X } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AssignmentWithUser } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import { logger } from "@/utils/logger";

interface EmployeeSelectorProps {
  shiftId: string;
  selectedEmployees?: AssignmentWithUser[];
}

export function EmployeeSelector({
  shiftId,
  selectedEmployees = [],
}: EmployeeSelectorProps) {
  const { employees = [], loading, error } = useEmployees();
  const {
    mutations: { assign: assignUserToShift, unassign: unassignUserFromShift },
  } = useScheduling();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleAssignEmployee = async (employeeId: string) => {
    try {
      const success = await assignUserToShift(shiftId, employeeId);
      if (success) {
        setOpen(false);
        toast({
          title: "Employee assigned",
          description: "Employee has been assigned to this shift.",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to assign employee";
      logger.error("Error assigning employee:", { error, tags: ["error"] });
      toast({
        title: "Assignment failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUnassignEmployee = async (employeeId: string) => {
    try {
      const success = await unassignUserFromShift(shiftId, employeeId);
      if (success) {
        toast({
          title: "Employee unassigned",
          description: "Employee has been removed from this shift.",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to unassign employee";
      logger.error("Error unassigning employee:", { error, tags: ["error"] });
      toast({
        title: "Unassignment failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const availableEmployees = Array.isArray(employees)
    ? employees.filter(
        (emp) =>
          !selectedEmployees.some((assigned) => assigned.user_id === emp.id),
      )
    : [];

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading employees...</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Error loading employees: {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Currently assigned employees */}
      {selectedEmployees.length > 0 ? (
        <div className="space-y-2">
          {selectedEmployees.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignment.user?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {assignment.user?.first_name?.[0]}
                    {assignment.user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {assignment.user?.first_name} {assignment.user?.last_name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {assignment.status || "assigned"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnassignEmployee(assignment.user_id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">
          No employees assigned
        </div>
      )}

      {/* Add employee button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search employees..." />
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {Array.isArray(availableEmployees) &&
              availableEmployees.length > 0 ? (
                availableEmployees.map((employee) => {
                  if (!employee || !employee.id) {
                    logger.warn("Invalid employee data:", {
                      context: { employee },
                      tags: ["warning"],
                    });
                    return null;
                  }
                  return (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.first_name || ""} ${employee.last_name || ""}`}
                      onSelect={() => handleAssignEmployee(employee.id)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={employee.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {employee.first_name?.[0] || "?"}
                          {employee.last_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {employee.first_name || ""} {employee.last_name || ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {employee.role || "Employee"}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })
              ) : (
                <div className="p-2 text-sm text-muted-foreground">
                  No available employees
                </div>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
