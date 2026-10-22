import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
              {t("schedule.add")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowAddShift(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              {t("schedule.singleShift")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAddShift(true)}>
              <Copy className="mr-2 h-4 w-4" />
              {t("schedule.multipleShifts")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowImportShifts(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t("schedule.importFromExcelCsv")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              {t("schedule.addUnavailability")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="mr-2 h-4 w-4" />
              {t("schedule.addTimeOff2")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Week Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              {t("schedule.weekActions")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleCopyPreviousWeek}>
              <Copy className="mr-2 h-4 w-4" />
              {t("schedule.copyPreviousWeek")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAutoAssign}>
              <Wand2 className="mr-2 h-4 w-4" />
              {t("schedule.autoAssignUnfilled")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearWeek}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("schedule.clearWeek")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePublishWeek}>
              <Eye className="mr-2 h-4 w-4" />
              {t("schedule.publishWeek")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <EyeOff className="mr-2 h-4 w-4" />
              {t("schedule.unpublishWeek")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t("schedule.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleExportWeek("csv")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("schedule.exportAsCsv")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportWeek("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("schedule.exportAsExcel")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExportWeek("print")}>
              <Printer className="mr-2 h-4 w-4" />
              {t("schedule.printWeek")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Templates */}
        <Button variant="outline" onClick={() => setShowWeekTemplate(true)}>
          <Settings className="mr-2 h-4 w-4" />
          {t("schedule.templates")}
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
