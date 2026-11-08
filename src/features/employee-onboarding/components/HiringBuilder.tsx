import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import type { HiringBlock } from "../hiringModel";
import { loadHiringBlocks, saveHiringBlocks, uploadHiringShare } from "../hiringStore";
import { HiringBuilderView } from "./HiringBuilderView";

export function HiringBuilder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const userId = profile?.id ?? null;
  const [blocks, setBlocks] = useState<HiringBlock[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    void loadHiringBlocks(companyId).then((rows) => {
      if (rows) setBlocks(rows);
      setReady(true);
    });
  }, [companyId]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">{t("employeeOnboarding.loading")}</p>;
  }

  return (
    <div className="space-y-3">
      <HiringBuilderView
        blocks={blocks}
        canManage
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
    </div>
  );
}
