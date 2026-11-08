import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { HIRING_FILE_ACCEPT } from "../hiringFiles";
import { hiringAnswerDone, type HiringAnswer, type HiringBlock } from "../hiringModel";
import { loadHiringBlocks } from "../hiringStore";
import { COMPANY_DOCS_BUCKET, EMPLOYEE_FILES_BUCKET } from "../constants";
import { acceptedOnboardingFile, employeeFilePath } from "../model";
import { openPrivateOnboardingFile, uploadPrivateOnboardingFile } from "../storage";

export function HiringChecklist() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const profileId = profile?.id ?? null;
  const [blocks, setBlocks] = useState<HiringBlock[]>([]);
  const [answers, setAnswers] = useState<Record<string, HiringAnswer>>({});

  useEffect(() => {
    if (!companyId || !profileId) return;
    void loadHiringBlocks(companyId).then(async (rows) => {
      if (!rows) return;
      setBlocks(rows);
      const { data } = await db
        .from("hiring_responses")
        .select("block_id, text_value, bool_value, date_value, file_name, status, verified_at")
        .eq("profile_id", profileId);
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
      setAnswers(next);
    });
  }, [companyId, profileId]);

  if (!companyId || blocks.length === 0) return null;

  const save = async (block: HiringBlock, patch: Partial<HiringAnswer>) => {
    if (!profileId) return;
    const current = answers[block.id] ?? {
      blockId: block.id,
      textValue: "",
      boolValue: null,
      dateValue: null,
      fileName: null,
      done: false,
      verified: false,
    };
    const next = { ...current, ...patch };
    next.done = hiringAnswerDone(block, next);
    setAnswers((map) => ({ ...map, [block.id]: next }));
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
    <section className="space-y-3" data-testid="hiring-checklist">
      <h2 className="text-lg font-semibold">{t("hiring.checklistTitle")}</h2>
      {blocks.map((block) => {
        const answer = answers[block.id];
        return (
          <article key={block.id} className="space-y-2 rounded-lg border p-3" data-testid={`hiring-check-${block.kind}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{block.title}</h3>
              <span className="text-xs text-muted-foreground">
                {answer?.verified
                  ? t("hiring.verified")
                  : block.required
                    ? t("employeeOnboarding.required")
                    : t("employeeOnboarding.optional")}
              </span>
            </div>
            {block.kind === "share_card" ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.body) }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{block.body}</p>
            )}
            {block.kind === "share_file" && block.storagePath ? (
              <Button type="button" variant="outline" onClick={() => void openPrivateOnboardingFile(COMPANY_DOCS_BUCKET, block.storagePath!)}>
                {t("employeeOnboarding.openDocument")}
              </Button>
            ) : null}
            {block.kind === "collect_link" && block.linkUrl ? (
              <a className="text-sm text-primary underline" href={block.linkUrl} target="_blank" rel="noreferrer">
                {block.linkUrl}
              </a>
            ) : null}
            {block.kind === "collect_text" || block.kind === "collect_long_text" ? (
              block.kind === "collect_long_text" ? (
                <Textarea value={answer?.textValue ?? ""} onChange={(event) => void save(block, { textValue: event.target.value })} />
              ) : (
                <Input className="min-h-11" value={answer?.textValue ?? ""} onChange={(event) => void save(block, { textValue: event.target.value })} />
              )
            ) : null}
            {block.kind === "collect_date" ? (
              <Input className="min-h-11" type="date" value={answer?.dateValue ?? ""} onChange={(event) => void save(block, { dateValue: event.target.value })} />
            ) : null}
            {block.kind === "collect_yes_no" || block.kind === "collect_ack" || block.kind === "collect_link" || block.kind === "share_card" ? (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox
                  checked={answer?.boolValue === true || answer?.done === true}
                  onCheckedChange={(checked) => void save(block, { boolValue: checked === true, done: checked === true })}
                />
                {block.kind === "collect_ack" || block.kind === "share_card"
                  ? t("employeeOnboarding.acknowledgeLabel")
                  : t("hiring.markDone")}
              </label>
            ) : null}
            {block.kind === "collect_file" ? (
              <Input
                className="min-h-11"
                type="file"
                accept={HIRING_FILE_ACCEPT}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || !profileId || !acceptedOnboardingFile(file)) return;
                  const path = employeeFilePath(companyId, profileId, block.id, file.name);
                  void uploadPrivateOnboardingFile(EMPLOYEE_FILES_BUCKET, path, file).then(() =>
                    save(block, { fileName: file.name, done: true }),
                  );
                }}
              />
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
