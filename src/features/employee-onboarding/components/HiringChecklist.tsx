import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import {
  hiringAnswerDone,
  mergeHiringAnswer,
  openRequiredHiringBlocks,
  type HiringAnswer,
  type HiringBlock,
} from "../hiringModel";
import { logHireActivity } from "@/features/employees/hireActivity";
import { loadHiringBlocks } from "../hiringStore";
import { EMPLOYEE_FILES_BUCKET } from "../constants";
import { acceptedOnboardingFile, employeeFilePath } from "../model";
import { uploadPrivateOnboardingFile } from "../storage";
import { HiringChecklistView } from "./HiringChecklistView";

export function HiringChecklist({
  onProgress,
}: {
  onProgress?: (progress: { blocks: HiringBlock[]; openRequired: number; ready: boolean }) => void;
}) {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const profileId = profile?.id ?? null;
  const [blocks, setBlocks] = useState<HiringBlock[]>([]);
  const [answers, setAnswers] = useState<Record<string, HiringAnswer>>({});
  const [ready, setReady] = useState(false);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!companyId || !profileId) {
      setBlocks([]);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void loadHiringBlocks(companyId).then(async (rows) => {
      if (cancelled) return;
      const nextBlocks = rows ?? [];
      const { data } = await db
        .from("hiring_responses")
        .select("block_id, text_value, bool_value, date_value, file_name, status, verified_at")
        .eq("profile_id", profileId);
      if (cancelled) return;
      const next: Record<string, HiringAnswer> = {};
      for (const row of data ?? []) {
        const record = row as Record<string, unknown>;
        const blockId = String(record.block_id ?? "");
        next[blockId] = {
          blockId,
          textValue: typeof record.text_value === "string" ? record.text_value : "",
          boolValue: typeof record.bool_value === "boolean" ? record.bool_value : null,
          dateValue: typeof record.date_value === "string" ? record.date_value : null,
          fileName: typeof record.file_name === "string" ? record.file_name : null,
          done: record.status === "done" || record.status === "verified",
          verified: Boolean(record.verified_at),
        };
      }
      setBlocks(nextBlocks);
      setAnswers(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, profileId]);

  useEffect(() => {
    if (!ready) return;
    onProgressRef.current?.({
      blocks,
      openRequired: openRequiredHiringBlocks(blocks, answers).length,
      ready: true,
    });
  }, [answers, blocks, ready]);

  if (!ready || !companyId || blocks.length === 0) return null;

  const save = async (block: HiringBlock, patch: Partial<HiringAnswer>) => {
    if (!profileId) return;
    const current = answers[block.id];
    const wasDone = hiringAnswerDone(block, current);
    const next = mergeHiringAnswer(block, current, patch);
    setAnswers((map) => ({ ...map, [block.id]: next }));
    if (next.done && !wasDone) {
      const action = block.kind === "collect_file" ? "hire.file_submitted" : "hire.step_completed";
      void logHireActivity({ profileId, action, step: block.title });
    }
    await db.from("hiring_responses").upsert({
      company_id: companyId,
      block_id: block.id,
      profile_id: profileId,
      text_value: next.textValue,
      bool_value: next.boolValue,
      date_value: next.dateValue,
      file_name: next.fileName,
      status: next.done ? "done" : "pending",
      completed_at: next.done ? new Date().toISOString() : null,
    }, { onConflict: "block_id,profile_id" });
  };

  return (
    <div className="px-4 py-4 sm:px-6">
      <HiringChecklistView
        blocks={blocks}
        answers={answers}
        onAnswer={(block, patch) => {
          void save(block, patch);
        }}
        onUpload={(block, file) => {
          if (!profileId || !acceptedOnboardingFile(file)) return;
          const path = employeeFilePath(companyId, profileId, block.id, file.name);
          void uploadPrivateOnboardingFile(EMPLOYEE_FILES_BUCKET, path, file).then(() =>
            save(block, { fileName: file.name, done: true }),
          );
        }}
      />
    </div>
  );
}
