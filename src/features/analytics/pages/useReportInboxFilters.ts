import { useMemo, useState } from "react";
import type { DocumentWithRelations } from "@/types/ingestion";
import type { ReportInboxProcessingFilter } from "@/features/analytics/pages/ReportInboxStatusFilters";

function matchSearch(doc: DocumentWithRelations, term: string) {
  const text =
    `${doc.title ?? ""} ${doc.source ?? ""} ${doc.file?.filename ?? ""}`.toLowerCase();
  return text.includes(term);
}

function matchProcessingFilter(
  doc: DocumentWithRelations,
  filter: ReportInboxProcessingFilter,
) {
  if (filter === "all") return true;
  const state = doc.processing_state ?? "pending";
  if (filter === "ready") return state === "ready";
  if (filter === "error") return state === "error";
  return ["pending", "processing"].includes(state);
}

export function useReportInboxFilters(documents: DocumentWithRelations[]) {
  const [search, setSearch] = useState("");
  const [processingFilter, setProcessingFilter] =
    useState<ReportInboxProcessingFilter>("all");

  const searchMatchedDocuments = useMemo(() => {
    if (!search) return documents;
    const term = search.toLowerCase();
    return documents.filter((doc) => matchSearch(doc, term));
  }, [documents, search]);

  const filteredDocuments = useMemo(
    () =>
      searchMatchedDocuments.filter((doc) =>
        matchProcessingFilter(doc, processingFilter),
      ),
    [processingFilter, searchMatchedDocuments],
  );

  const reportSummary = useMemo(() => {
    const ready = searchMatchedDocuments.filter(
      (doc) => doc.processing_state === "ready",
    ).length;
    const processing = searchMatchedDocuments.filter((doc) =>
      ["pending", "processing"].includes(doc.processing_state ?? "pending"),
    ).length;
    const errors = searchMatchedDocuments.filter(
      (doc) => doc.processing_state === "error",
    ).length;
    const criticalEvents = searchMatchedDocuments.reduce(
      (sum, doc) =>
        sum +
        doc.events.filter((event) => event.severity === "critical").length,
      0,
    );
    const followUps = searchMatchedDocuments.reduce(
      (sum, doc) => sum + (doc.originating_tasks?.length ?? 0),
      0,
    );
    return { ready, processing, errors, criticalEvents, followUps };
  }, [searchMatchedDocuments]);

  return {
    search,
    setSearch,
    processingFilter,
    setProcessingFilter,
    filteredDocuments,
    reportSummary,
  };
}