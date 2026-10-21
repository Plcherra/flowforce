import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddNewSectionButton } from "@/app-shell/navigation/sidebar/AddNewSectionButton";
import type { ProcessedNavigationSection } from "@/hooks/useNavigationData";
import { cn } from "@/lib/utils";
import { navItemLabel, navSectionLabel } from "./bottomNavDestinations";
import { NavGlyph } from "./NavGlyph";

interface BottomNavMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ProcessedNavigationSection[];
  canManageSections: boolean;
  onSelect: (href: string) => void;
}

export function BottomNavMoreSheet({
  open,
  onOpenChange,
  sections,
  canManageSections,
  onSelect,
}: BottomNavMoreSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(78dvh,40rem)] overflow-y-auto rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{t("navigation.more", { defaultValue: "More" })}</SheetTitle>
          <SheetDescription>
            {t("navigation.moreDescription", {
              defaultValue: "Jump into another part of FlowForce",
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mx-auto mt-4 max-w-3xl space-y-5" data-testid="more-app-grid">
          {sections.map((section) => {
            const sectionLabel = navSectionLabel(t, section);
            return (
              <section key={section.id} aria-label={sectionLabel}>
                <h3 className="mb-2 text-xs text-muted-foreground">{sectionLabel}</h3>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {section.items.map((item) => {
                    const label = navItemLabel(t, item);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(item.href)}
                          aria-current={item.isActive ? "page" : undefined}
                          className={cn(
                            "flex h-full w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
                            item.isActive && "bg-primary/10 text-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-11 w-11 place-items-center rounded-2xl bg-muted",
                              item.isActive && "bg-primary/15",
                            )}
                          >
                            <NavGlyph icon={item.icon} className="h-5 w-5" />
                          </span>
                          <span className="line-clamp-2 text-center text-xs font-medium leading-tight">
                            {label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {canManageSections ? (
                    <li>
                      <AddNewSectionButton
                        category={sectionLabel}
                        categoryKey={section.translationKey || "custom"}
                        onNavigate={() => onOpenChange(false)}
                      />
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}

          {sections.length === 0 && canManageSections ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <li>
                <AddNewSectionButton
                  category={t("navigation.custom", { defaultValue: "Custom" })}
                  categoryKey="custom"
                  onNavigate={() => onOpenChange(false)}
                />
              </li>
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
