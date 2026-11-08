import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/features/company-updates/wizard/RichTextEditor";
import { HIRING_FILE_ACCEPT } from "../hiringFiles";
import type { HiringBlock } from "../hiringModel";

export function HiringBlockFields({
  block,
  canManage,
  onChange,
  onUpload,
  onMove,
  onRemove,
}: {
  block: HiringBlock;
  canManage: boolean;
  onChange: (patch: Partial<HiringBlock>) => void;
  onUpload: (file: File) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const collect = block.kind.startsWith("collect");
  return (
    <article className="space-y-3 rounded-lg border p-3" data-testid={`hiring-block-${block.kind}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t(`hiring.kind.${block.kind}`)}</p>
        {canManage ? (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onMove(-1)}>
              {t("employeeOnboarding.moveUp")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onMove(1)}>
              {t("employeeOnboarding.moveDown")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onRemove}>
              {t("hiring.removeBlock")}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label>{t("hiring.blockTitle")}</Label>
        <Input
          className="min-h-11"
          value={block.title}
          disabled={!canManage}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>
      {block.kind === "share_card" ? (
        <RichTextEditor
          value={block.body}
          placeholder={t("hiring.cardPlaceholder")}
          onChange={(html) => onChange({ body: html })}
        />
      ) : (
        <div className="space-y-2">
          <Label>{collect ? t("hiring.collectDescription") : t("hiring.shareDescription")}</Label>
          <Textarea
            value={block.body}
            disabled={!canManage}
            placeholder={
              block.kind === "collect_file"
                ? t("hiring.uploadExample")
                : t("hiring.instructionsPlaceholder")
            }
            onChange={(event) => onChange({ body: event.target.value })}
          />
        </div>
      )}
      {block.kind === "collect_link" ? (
        <div className="space-y-2">
          <Label>{t("hiring.linkLabel")}</Label>
          <Input
            className="min-h-11"
            value={block.linkUrl ?? ""}
            disabled={!canManage}
            placeholder={t("hiring.linkPlaceholder")}
            onChange={(event) => onChange({ linkUrl: event.target.value })}
          />
        </div>
      ) : null}
      {block.kind === "share_file" && canManage ? (
        <div className="space-y-2">
          <Label>{t("hiring.uploadShare")}</Label>
          <Input
            className="min-h-11"
            type="file"
            accept={HIRING_FILE_ACCEPT}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          {block.fileName ? <p className="text-sm text-muted-foreground">{block.fileName}</p> : null}
        </div>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox
          checked={block.required}
          disabled={!canManage}
          onCheckedChange={(checked) => onChange({ required: checked === true })}
        />
        {t("employeeOnboarding.requiredStep")}
      </label>
    </article>
  );
}
