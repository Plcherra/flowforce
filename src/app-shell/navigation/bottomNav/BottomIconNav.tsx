import { useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@/lib/router-adapter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationData } from "@/hooks/useNavigationData";
import { BottomIconButton } from "./BottomIconButton";
import { BottomNavMoreSheet } from "./BottomNavMoreSheet";
import {
  bottomNavGroupName,
  groupWideBottomNav,
  isMoreNavActive,
  navItemLabel,
  partitionBottomNavigation,
  shouldShowMoreNav,
} from "./bottomNavDestinations";
import { NavGlyph } from "./NavGlyph";

const BOTTOM_NAV_STACK = "calc(4.75rem + env(safe-area-inset-bottom))";

export function BottomIconNav() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { processedSections, canManageSections, getIsActive } = useNavigationData();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--bottom-nav-stack");
    root.style.setProperty("--bottom-nav-stack", BOTTOM_NAV_STACK);
    return () => {
      if (previous) {
        root.style.setProperty("--bottom-nav-stack", previous);
      } else {
        root.style.removeProperty("--bottom-nav-stack");
      }
    };
  }, []);

  const sections = Array.isArray(processedSections) ? processedSections : [];
  const isActive = typeof getIsActive === "function" ? getIsActive : () => false;
  const { primary, moreSections } = partitionBottomNavigation(
    sections,
    isActive("/dashboard") || isActive("/app/dashboard"),
  );
  const showMore = shouldShowMoreNav(moreSections, Boolean(canManageSections));
  const moreActive = isMoreNavActive(moreSections);
  const moreLabel = t("navigation.more", { defaultValue: "More" });
  const addLabel = t("navigation.addNew", { defaultValue: "Add new" });
  const groups = groupWideBottomNav(sections, isActive("/dashboard") || isActive("/app/dashboard"));
  const primaryIds = new Set(primary.map((item) => item.id));

  return (
    <TooltipProvider delayDuration={300}>
      <nav aria-label="Main" data-bottom-icon-nav="true" className="bottom-icon-nav">
        <div className="bottom-icon-nav-icons border-0 bg-transparent shadow-none backdrop-blur-none">
          {groups.map((group) => {
            const visibleOnPhone = group.items.some((item) =>
              primaryIds.has(item.id),
            );
            return (
              <div
                key={group.id}
                className={
                  visibleOnPhone
                    ? "bottom-icon-nav-group"
                    : "bottom-icon-nav-group hidden lg:flex"
                }
              >
                <span className="bottom-icon-nav-label">
                  {bottomNavGroupName(t, group)}
                </span>
                <span className="bottom-icon-nav-rule" aria-hidden="true" />
                {group.items.map((item) => {
                  const label = navItemLabel(t, item);
                  return (
                    <BottomIconButton
                      key={item.id}
                      label={label}
                      active={item.isActive}
                      className={
                        primaryIds.has(item.id) ? undefined : "hidden lg:flex"
                      }
                      onClick={() => navigate(item.href)}
                    >
                      <NavGlyph icon={item.icon} />
                    </BottomIconButton>
                  );
                })}
              </div>
            );
          })}
          {canManageSections ? (
            <BottomIconButton
              label={addLabel}
              active={false}
              expanded={moreOpen}
              className="hidden lg:flex"
              onClick={() => setMoreOpen(true)}
            >
              <Plus className="h-6 w-6" aria-hidden="true" />
            </BottomIconButton>
          ) : null}
          {showMore ? (
            <BottomIconButton
              label={moreLabel}
              active={moreActive}
              expanded={moreOpen}
              className="lg:hidden"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
            </BottomIconButton>
          ) : null}
        </div>
      </nav>

      <BottomNavMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        sections={moreSections}
        canManageSections={Boolean(canManageSections)}
        onSelect={(href) => {
          setMoreOpen(false);
          navigate(href);
        }}
      />
    </TooltipProvider>
  );
}
