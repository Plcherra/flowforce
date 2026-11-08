import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HIRING_BLOCK_KINDS, blankHiringBlock, moveHiringBlock, type HiringBlock, type HiringBlockKind } from "../hiringModel";
import { HiringBlockFields } from "./HiringBlockFields";

export function HiringBuilderView({
  blocks,
  canManage,
  onChange,
  onUpload,
}: {
  blocks: HiringBlock[];
  canManage: boolean;
  onChange: (blocks: HiringBlock[]) => void;
  onUpload: (block: HiringBlock, file: File) => void;
}) {
  const { t } = useTranslation();
  const add = (kind: HiringBlockKind) => {
    const block = blankHiringBlock(kind, blocks.length);
    block.id = `draft-${kind}-${blocks.length}`;
    onChange([...blocks, block]);
  };

  return (
    <div className="space-y-4" data-testid="hiring-builder">
      <div>
        <h3 className="text-lg font-semibold">{t("hiring.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("hiring.help")}</p>
      </div>
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="hiring-empty">
          {t("hiring.empty")}
        </p>
      ) : null}
      {blocks.map((block) => (
        <HiringBlockFields
          key={block.id}
          block={block}
          canManage={canManage}
          onChange={(patch) =>
            onChange(blocks.map((item) => (item.id === block.id ? { ...item, ...patch } : item)))
          }
          onUpload={(file) => onUpload(block, file)}
          onMove={(direction) => onChange(moveHiringBlock(blocks, block.id, direction))}
          onRemove={() => onChange(blocks.filter((item) => item.id !== block.id))}
        />
      ))}
      {canManage ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("hiring.addShare")}</p>
          <div className="flex flex-wrap gap-2">
            {HIRING_BLOCK_KINDS.filter((kind) => kind.startsWith("share")).map((kind) => (
              <Button key={kind} type="button" variant="outline" className="min-h-11" onClick={() => add(kind)}>
                {t(`hiring.kind.${kind}`)}
              </Button>
            ))}
          </div>
          <p className="text-sm font-medium">{t("hiring.addCollect")}</p>
          <div className="flex flex-wrap gap-2">
            {HIRING_BLOCK_KINDS.filter((kind) => kind.startsWith("collect")).map((kind) => (
              <Button key={kind} type="button" variant="outline" className="min-h-11" data-testid={`hiring-add-${kind}`} onClick={() => add(kind)}>
                {t(`hiring.kind.${kind}`)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
