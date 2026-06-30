/**
 * Bulk invite form component
 */

import { useState, useMemo } from "react";
import { FileSpreadsheet, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BulkInviteRow, BulkInviteResult } from "../../types/invites";
import { parseCsvForBulkInvites } from "../../utils/inviteHelpers";

interface BulkInviteFormProps {
  onFileSelect: (rows: BulkInviteRow[]) => void;
  preview: BulkInviteRow[];
  results: BulkInviteResult[];
  errorText: string | null;
  onProcess: () => void;
  isPending: boolean;
  onCopyLink: (link: string | null) => void;
  onError?: (error: string) => void;
}

export function BulkInviteForm({
  onFileSelect,
  preview,
  results,
  errorText,
  onProcess,
  isPending,
  onCopyLink,
  onError,
}: BulkInviteFormProps) {
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { rows, error } = parseCsvForBulkInvites(text);
    if (error) {
      if (onError) {
        onError(error);
      }
      onFileSelect([]);
      return;
    }
    onFileSelect(rows);
    setFileInputKey((prev) => prev + 1);
  };

  const bulkSummary = useMemo(() => {
    const success = results.filter(
      (result) => result.status === "success",
    ).length;
    const errors = results.filter((result) => result.status === "error").length;
    return { success, errors };
  }, [results]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload</CardTitle>
        <CardDescription>
          Upload a CSV file with columns: email, first_name, last_name, role
          (optional). Maximum 200 rows per upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            key={fileInputKey}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="flex-1"
          />
          <Button
            onClick={onProcess}
            disabled={preview.length === 0 || isPending}
          >
            {isPending ? "Processing..." : "Process Invites"}
          </Button>
        </div>

        {errorText && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium">
                {preview.length} invite{preview.length === 1 ? "" : "s"} ready
              </span>
            </div>
            <ScrollArea className="h-32 rounded-md border">
              <div className="divide-y text-sm">
                {preview.map((row, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{row.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.firstName} {row.lastName} • {row.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3 rounded-lg border border-muted p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Results</Badge>
              <span>{bulkSummary.success} invites created</span>
              {bulkSummary.errors > 0 && (
                <span className="text-destructive">
                  {bulkSummary.errors} failed
                </span>
              )}
            </div>
            <ScrollArea className="h-40 rounded-md border">
              <div className="divide-y text-sm">
                {results.map((result) => (
                  <div
                    key={result.email}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{result.email}</p>
                      {result.status === "error" && (
                        <p className="text-xs text-destructive">
                          {result.message}
                        </p>
                      )}
                    </div>
                    {result.status === "success" ? (
                      <div className="flex items-center gap-2">
                        {result.onboardingTriggered === false && (
                          <Badge
                            variant="outline"
                            className="border-yellow-400 bg-yellow-50 text-yellow-700"
                          >
                            Onboarding pending
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCopyLink(result.inviteLink ?? null)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy link
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
