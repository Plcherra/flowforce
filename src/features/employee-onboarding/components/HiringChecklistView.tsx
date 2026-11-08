"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckSquare, Coffee, FileText, Link2, PenLine, Upload } from "lucide-react";
import { HIRING_FILE_ACCEPT } from "../hiringFiles";
import {
  hiringChecklistProgress,
  type HiringAnswer,
  type HiringBlock,
  type HiringBlockKind,
} from "../hiringModel";
import { COMPANY_DOCS_BUCKET } from "../constants";
import { openPrivateOnboardingFile } from "../storage";

function sanitizeHiringHtml(value: string) {
  if (typeof window === "undefined") return "";
  const candidate = DOMPurify as unknown as {
    sanitize?: (html: string) => string;
    (root: Window): { sanitize: (html: string) => string };
  };
  if (typeof candidate.sanitize === "function") return candidate.sanitize(value);
  if (typeof candidate === "function") return candidate(window).sanitize(value);
  return "";
}

function HiringRichText({ html }: { html: string }) {
  const [clean, setClean] = useState("");
  useEffect(() => {
    setClean(sanitizeHiringHtml(html));
  }, [html]);
  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

const BLOCK_ICONS: Record<HiringBlockKind, typeof Coffee> = {
  share_card: Coffee,
  share_file: FileText,
  collect_file: Upload,
  collect_text: PenLine,
  collect_long_text: PenLine,
  collect_yes_no: CheckSquare,
  collect_date: Calendar,
  collect_ack: CheckSquare,
  collect_link: Link2,
};

export function HiringChecklistView({
  blocks,
  answers,
  onAnswer,
  onUpload,
}: {
  blocks: HiringBlock[];
  answers: Record<string, HiringAnswer | undefined>;
  onAnswer: (block: HiringBlock, patch: Partial<HiringAnswer>) => void;
  onUpload: (block: HiringBlock, file: File) => void;
}) {
  const { t } = useTranslation();
  const progress = hiringChecklistProgress(blocks, answers);
  if (blocks.length === 0) return null;

  return (
    <section className="space-y-4" data-testid="hiring-checklist">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-xl font-semibold">{t("employeeOnboarding.checklistTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("employeeOnboarding.pageSubtitle")}</p>
        </div>
        <Badge variant="outline" data-testid="hiring-progress">
          {t("employeeOnboarding.checklistProgress", {
            done: progress.done,
            total: progress.total,
          })}
        </Badge>
      </div>
      {blocks.map((block) => {
        const answer = answers[block.id];
        const Icon = BLOCK_ICONS[block.kind];
        const status = answer?.verified
          ? t("hiring.verified")
          : answer?.done
            ? t("employeeOnboarding.done")
            : block.required
              ? t("employeeOnboarding.required")
              : t("employeeOnboarding.optional");
        return (
          <Card
            key={block.id}
            className="overflow-hidden bg-primary/5 ring-2 ring-primary/20"
            data-testid={`hiring-check-${block.kind}`}
          >
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  {block.title}
                </CardTitle>
                <Badge variant="outline">{status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {block.kind === "share_card" ? (
                <HiringRichText html={block.body} />
              ) : block.body ? (
                <p className="text-muted-foreground">{block.body}</p>
              ) : null}
              {block.kind === "share_file" && block.storagePath ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void openPrivateOnboardingFile(COMPANY_DOCS_BUCKET, block.storagePath!)}
                >
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
                  <Textarea
                    value={answer?.textValue ?? ""}
                    onChange={(event) => onAnswer(block, { textValue: event.target.value })}
                  />
                ) : (
                  <Input
                    className="min-h-11 bg-card"
                    value={answer?.textValue ?? ""}
                    onChange={(event) => onAnswer(block, { textValue: event.target.value })}
                  />
                )
              ) : null}
              {block.kind === "collect_date" ? (
                <Input
                  className="min-h-11 bg-card"
                  type="date"
                  value={answer?.dateValue ?? ""}
                  onChange={(event) => onAnswer(block, { dateValue: event.target.value })}
                />
              ) : null}
              {block.kind === "collect_yes_no" ||
              block.kind === "collect_ack" ||
              block.kind === "collect_link" ||
              block.kind === "share_card" ? (
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    checked={answer?.boolValue === true || answer?.done === true}
                    onCheckedChange={(checked) =>
                      onAnswer(block, { boolValue: checked === true, done: checked === true })
                    }
                  />
                  {block.kind === "collect_ack" || block.kind === "share_card"
                    ? t("employeeOnboarding.acknowledgeLabel")
                    : t("hiring.markDone")}
                </label>
              ) : null}
              {block.kind === "collect_file" ? (
                <div className="rounded-lg border bg-card p-3">
                  <Input
                    className="min-h-11"
                    type="file"
                    accept={HIRING_FILE_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUpload(block, file);
                      event.target.value = "";
                    }}
                  />
                  {answer?.fileName ? (
                    <p className="mt-2 text-sm">
                      {t("employeeOnboarding.fileReady")}: {answer.fileName}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
