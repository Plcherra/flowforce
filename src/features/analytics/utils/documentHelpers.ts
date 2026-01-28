/**
 * Document processing utility functions
 */

import type { DocumentWithRelations } from "@/types/ingestion";

/**
 * Parse accuracy/confidence from document metadata
 */
export function parseMetaAccuracy(
  document: DocumentWithRelations,
): number | null {
  const meta = ((document as any).meta ?? {}) as Record<string, any>;
  if (typeof meta?.accuracy === "number") {
    return Math.round(meta.accuracy * 100);
  }
  if (typeof meta?.confidence === "number") {
    return Math.round(meta.confidence * 100);
  }
  return null;
}
