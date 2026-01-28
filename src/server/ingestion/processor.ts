import {
  markDocumentFailed,
  markDocumentProcessing,
  markDocumentReady,
  persistExtractedEvents,
  type CompleteDocumentParams,
  type ParsedEventInput,
} from "@/services/ingestion/api";

interface SimulationOptions {
  documentId: string;
  document?: CompleteDocumentParams;
  events?: ParsedEventInput[];
  companyId?: string;
}

export async function simulateDocumentProcessing(options: SimulationOptions) {
  const { documentId, document, events = [], companyId } = options;

  try {
    await markDocumentProcessing(documentId);
    await markDocumentReady(documentId, document);

    if (events.length) {
      await persistExtractedEvents(documentId, events, companyId);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";
    await markDocumentFailed(documentId, message);
    throw error;
  }
}
