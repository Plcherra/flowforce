import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import type { HiringBlock } from "../hiringModel";
import { loadHiringBlocks, saveHiringBlocks, uploadHiringShare } from "../hiringStore";
import { HiringBuilderView } from "./HiringBuilderView";

function hiringFingerprint(blocks: HiringBlock[]) {
  return JSON.stringify(
    blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      title: block.title,
      body: block.body,
      required: block.required,
      sortOrder: block.sortOrder,
      linkUrl: block.linkUrl,
      fileName: block.fileName,
      storagePath: block.storagePath,
    })),
  );
}

export type HiringBuilderHandle = {
  save: () => Promise<boolean>;
};

export const HiringBuilder = forwardRef<HiringBuilderHandle, { canManage?: boolean }>(function HiringBuilder(
  { canManage = true },
  ref,
) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const userId = profile?.id ?? null;
  const [blocks, setBlocks] = useState<HiringBlock[]>([]);
  const [ready, setReady] = useState(false);
  const baseline = useRef("");

  useEffect(() => {
    if (!companyId) return;
    void loadHiringBlocks(companyId).then((rows) => {
      if (rows) {
        setBlocks(rows);
        baseline.current = hiringFingerprint(rows);
      }
      setReady(true);
    });
  }, [companyId]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!canManage) return false;
      if (!companyId || !userId) return blocks.every((block) => !block.title.trim());
      if (hiringFingerprint(blocks) === baseline.current) return true;
      const result = await saveHiringBlocks({ companyId, userId, blocks });
      if (!result.ok) return false;
      const rows = await loadHiringBlocks(companyId);
      if (rows) {
        setBlocks(rows);
        baseline.current = hiringFingerprint(rows);
      }
      return true;
    },
  }), [blocks, canManage, companyId, userId]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">{t("employeeOnboarding.loading")}</p>;
  }

  return (
    <div className="space-y-3">
      <HiringBuilderView
        blocks={blocks}
        canManage={canManage}
        onChange={setBlocks}
        onUpload={(block, file) => {
          if (!companyId || block.id.startsWith("draft-")) {
            toast({ title: t("hiring.saveBeforeFile"), variant: "destructive" });
            return;
          }
          void uploadHiringShare({ companyId, blockId: block.id, file }).then((result) => {
            if (!result.ok) {
              toast({ title: t("employeeOnboarding.fileType"), variant: "destructive" });
              return;
            }
            setBlocks((current) =>
              current.map((item) =>
                item.id === block.id
                  ? { ...item, fileName: result.fileName, storagePath: result.path }
                  : item,
              ),
            );
          });
        }}
      />
      {canManage ? (
      <Button
        type="button"
        data-testid="hiring-save"
        disabled={!companyId || !userId}
        onClick={() => {
          if (!companyId || !userId) return;
          void saveHiringBlocks({ companyId, userId, blocks }).then((result) => {
            toast({
              title: result.ok ? t("employeeOnboarding.saved") : t("employeeOnboarding.saveFailed"),
              variant: result.ok ? "default" : "destructive",
            });
            if (result.ok) {
              void loadHiringBlocks(companyId).then((rows) => {
                if (rows) setBlocks(rows);
              });
            }
          });
        }}
      >
        {t("hiring.save")}
      </Button>
      ) : null}
    </div>
  );
});
