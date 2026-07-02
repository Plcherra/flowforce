import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Calendar } from "lucide-react";
import { ShiftSwapsPanel } from "./ShiftSwapsPanel";
import { TimeOffManagementPanel } from "./TimeOffManagementPanel";
import { useSchedulingRole } from "../hooks/useSchedulingRole";

/**
 * Legacy combined staff management panel for managers.
 * Availability and separate time-off/swap panels are opened contextually.
 */
export function StaffShiftManagement() {
  const role = useSchedulingRole();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
        <p className="text-muted-foreground">
          Review shift swaps and time off requests from one place.
        </p>
      </div>

      <Tabs defaultValue="swaps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="swaps" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Shift Swaps
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Time Off
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swaps" className="space-y-4">
          <ShiftSwapsPanel canApprove={role.canApproveRequests} />
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-4">
          <TimeOffManagementPanel canApprove={role.canApproveRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
