import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
import { logger } from "@/utils/logger";

interface ImportShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportShiftsDialog({
  open,
  onOpenChange,
}: ImportShiftsDialogProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      // In a real implementation, this would parse the file and create shifts

      // Simulated import process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      logger.error("Error importing shifts:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // In a real implementation, this would generate and download a CSV/Excel template
    const csvContent = `Title,Start Date,Start Time,End Date,End Time,Location,Required Staff,Notes
Morning Shift,2025-06-20,09:00,2025-06-20,17:00,Store A,2,Regular morning shift
Evening Shift,2025-06-20,17:00,2025-06-21,01:00,Store A,1,Evening coverage`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shift_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("schedule.importShifts")}</DialogTitle>
          <DialogDescription>
            {t("schedule.uploadACsvOrExcelFileToImport")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                {t("schedule.downloadTemplate")}
              </CardTitle>
              <CardDescription>
                {t("schedule.startWithOurTemplateToEnsureProperFormatting")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {t("schedule.downloadCsvTemplate")}
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                {t("schedule.uploadFile")}
              </CardTitle>
              <CardDescription>
                {t("schedule.selectYourCsvOrExcelFileToImport")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">{t("schedule.chooseFile")}</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {selectedFile && (
                <div className="bg-success-muted border border-success/40 rounded-lg p-3">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-4 w-4 text-success mr-2" />
                    <span className="text-sm font-medium text-success">
                      {selectedFile.name}
                    </span>
                  </div>
                  <p className="text-xs text-success mt-1">
                    Ready to import • {Math.round(selectedFile.size / 1024)} KB
                  </p>
                </div>
              )}

              <div className="bg-warning-muted border border-warning/40 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-warning mr-2 mt-0.5" />
                  <div className="text-sm text-warning-foreground">
                    <p className="font-medium">{t("schedule.importantNotes")}</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                      <li>{t("schedule.datesShouldBeInYyyyMmDdFormat")}</li>
                      <li>{t("schedule.timesShouldBeInHhMmFormat24")}</li>
                      <li>{t("schedule.requiredStaffShouldBeANumber")}</li>
                      <li>{t("schedule.invalidRowsWillBeSkippedWithErrorsShown")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("schedule.cancel")}
            </Button>
            <Button onClick={handleImport} disabled={!selectedFile || loading}>
              {loading ? "Importing..." : "Import Shifts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
