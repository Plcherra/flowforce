import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { COMPANY_DOCS_BUCKET } from "./constants";
import { acceptedHiringFile } from "./hiringFiles";
import { hiringKind, type HiringBlock } from "./hiringModel";
import { companyDocumentPath } from "./model";
import { uploadPrivateOnboardingFile } from "./storage";

type Row = Record<string, unknown>;

function text(row: Row, key: string) {
  return typeof row[key] === "string" ? (row[key] as string) : "";
}

export function hiringBlockFromRow(row: Row): HiringBlock {
  return {
    id: text(row, "id"),
    kind: hiringKind(text(row, "kind")),
    title: text(row, "title"),
    body: text(row, "body"),
    required: row.required !== false,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    linkUrl: text(row, "link_url") || null,
    fileName: text(row, "file_name") || null,
    storagePath: text(row, "storage_path") || null,
  };
}

export async function loadHiringBlocks(companyId: string): Promise<HiringBlock[] | null> {
  const { data, error } = await db
    .from("hiring_blocks")
    .select("id, kind, title, body, required, sort_order, link_url, file_name, storage_path, archived_at")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true });
  if (error) return null;
  return ((data ?? []) as Row[])
    .filter((row) => !row.archived_at)
    .map(hiringBlockFromRow);
}

export async function saveHiringBlocks(input: {
  companyId: string;
  userId: string;
  blocks: HiringBlock[];
}) {
  const rows = input.blocks
    .filter((block) => block.title.trim())
    .map((block, index) => ({
      id: block.id.startsWith("draft-") ? crypto.randomUUID() : block.id,
      company_id: input.companyId,
      kind: block.kind,
      title: block.title.trim(),
      body: block.body,
      required: block.required,
      sort_order: index,
      link_url: block.linkUrl,
      file_name: block.fileName,
      storage_path: block.storagePath,
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return { ok: true as const };
  const { error } = await db.from("hiring_blocks").upsert(rows);
  if (error) return { ok: false as const };
  return { ok: true as const };
}

export async function uploadHiringShare(input: {
  companyId: string;
  blockId: string;
  file: File;
}) {
  if (!acceptedHiringFile(input.file)) return { ok: false as const };
  const path = companyDocumentPath(input.companyId, input.blockId, input.file.name);
  await uploadPrivateOnboardingFile(COMPANY_DOCS_BUCKET, path, input.file);
  return { ok: true as const, path, fileName: input.file.name };
}
