/**
 * Reports list component for ReportsAnalyzer
 */

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { safeArrayMap } from "@/utils/reactQueryTypes";
import type { DocumentWithRelations } from "@/types/ingestion";
import { parseMetaAccuracy } from "../../utils/documentHelpers";

interface ReportsListProps {
  documents: DocumentWithRelations[];
  selectedReportId: string | null;
  onReportSelect: (reportId: string | null) => void;
  followUpActions: number;
  filteredDocumentsLength: number;
}

export function ReportsList({
  documents,
  selectedReportId,
  onReportSelect,
  followUpActions: _followUpActions,
  filteredDocumentsLength: _filteredDocumentsLength,
}: ReportsListProps) {
  return (
    <ScrollArea className="max-h-[360px]">
      <div className="space-y-3">
        {safeArrayMap(documents, (document: DocumentWithRelations) => {
          const isActive = document.id === selectedReportId;
          const tasks = document.originating_tasks?.length ?? 0;
          const accuracy = parseMetaAccuracy(document);
          const processingState = document.processing_state ?? "ready";
          return (
            <button
              key={document.id}
              onClick={() => onReportSelect(isActive ? null : document.id)}
              className={`w-full rounded-lg border p-4 text-left transition ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      processingState === "ready" ? "default" : "secondary"
                    }
                  >
                    {processingState}
                  </Badge>
                  <span className="font-medium">
                    {document.title ??
                      document.file?.filename ??
                      "Untitled report"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {document.updated_at
                    ? formatDistanceToNow(new Date(document.updated_at), {
                        addSuffix: true,
                      })
                    : "Unknown"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Follow-ups: {tasks}</span>
                <Separator orientation="vertical" className="h-3" />
                <span>Source: {document.source ?? "N/A"}</span>
                {accuracy !== null && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span>Accuracy: {accuracy}%</span>
                  </>
                )}
              </div>
            </button>
          );
        })}

        {documents.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No reports processed during this window.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
