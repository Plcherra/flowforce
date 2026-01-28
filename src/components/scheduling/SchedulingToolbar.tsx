import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Copy,
  Download,
  Upload,
  Settings,
  Calendar,
  Users,
  FileSpreadsheet,
  Printer,
  Wand2,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { ShiftWizardDialog } from "./ShiftWizardDialog";
import { WeekTemplateDialog } from "./WeekTemplateDialog";
import { ImportShiftsDialog } from "./ImportShiftsDialog";

interface SchedulingToolbarProps {
  selectedDate: Date;
  currentView: string;
}

export function SchedulingToolbar({
  selectedDate,
  currentView,
}: SchedulingToolbarProps) {
  const [showAddShift, setShowAddShift] = useState(false);
  const [showWeekTemplate, setShowWeekTemplate] = useState(false);
  const [showImportShifts, setShowImportShifts] = useState(false);

  const handleCopyPreviousWeek = () => {
    // Implementation for copying previous week's schedule
  };

  const handleAutoAssign = () => {
    // Implementation for auto-assigning unfilled shifts
  };

  const handleClearWeek = () => {
    // Implementation for clearing entire week
  };

  const handlePublishWeek = () => {
    // Implementation for publishing week
  };

  const handleExportWeek = (format: "csv" | "xlsx" | "print") => {
    // Implementation for exporting week
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Add Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowAddShift(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Single Shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAddShift(true)}>
              <Copy className="mr-2 h-4 w-4" />
              Multiple Shifts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowImportShifts(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import from Excel/CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              Add Unavailability
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="mr-2 h-4 w-4" />
              Add Time-off
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Week Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Week Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleCopyPreviousWeek}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Previous Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAutoAssign}>
              <Wand2 className="mr-2 h-4 w-4" />
              Auto-assign Unfilled
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearWeek}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Week
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePublishWeek}>
              <Eye className="mr-2 h-4 w-4" />
              Publish Week
            </DropdownMenuItem>
            <DropdownMenuItem>
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish Week
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleExportWeek("csv")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportWeek("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExportWeek("print")}>
              <Printer className="mr-2 h-4 w-4" />
              Print Week
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Templates */}
        <Button variant="outline" onClick={() => setShowWeekTemplate(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Templates
        </Button>
      </div>

      {/* Dialogs */}
      <ShiftWizardDialog
        open={showAddShift}
        onOpenChange={setShowAddShift}
        selectedDate={selectedDate}
      />

      <WeekTemplateDialog
        open={showWeekTemplate}
        onOpenChange={setShowWeekTemplate}
        selectedDate={selectedDate}
      />

      <ImportShiftsDialog
        open={showImportShifts}
        onOpenChange={setShowImportShifts}
      />
    </>
  );
}
