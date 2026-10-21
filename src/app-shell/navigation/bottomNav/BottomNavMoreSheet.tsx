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
        className="max-h-[min(70dvh,32rem)] overflow-y-auto rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{t("navigation.more", { defaultValue: "More" })}</SheetTitle>
          <SheetDescription>
            {t("navigation.moreDescription", {
              defaultValue: "The rest of your workspace",
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {sections.map((section) => {
            const sectionLabel = navSectionLabel(t, section);
            return (
              <section key={section.id} aria-label={sectionLabel}>
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-primary/80">
                  {sectionLabel}
                </h3>
                <ul className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const label = navItemLabel(t, item);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(item.href)}
                          aria-current={item.isActive ? "page" : undefined}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
                            item.isActive && "bg-primary/10 font-medium text-primary",
                          )}
                        >
                          <NavGlyph icon={item.icon} className="h-4 w-4 shrink-0" />
                          <span>{label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {canManageSections ? (
                  <AddNewSectionButton
                    category={sectionLabel}
                    categoryKey={section.translationKey || "custom"}
                    onNavigate={() => onOpenChange(false)}
                  />
                ) : null}
              </section>
            );
          })}

          {sections.length === 0 && canManageSections ? (
            <AddNewSectionButton
              category={t("navigation.custom", { defaultValue: "Custom" })}
              categoryKey="custom"
              onNavigate={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
