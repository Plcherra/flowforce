import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@/lib/router-adapter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationData } from "@/hooks/useNavigationData";
import { BottomIconButton } from "./BottomIconButton";
import { BottomNavMoreSheet } from "./BottomNavMoreSheet";
import {
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

  return (
    <TooltipProvider delayDuration={300}>
      <nav aria-label="Main" data-bottom-icon-nav="true" className="bottom-icon-nav">
        <div className="pointer-events-auto flex items-center justify-center gap-0.5 border-0 bg-transparent px-2 shadow-none backdrop-blur-none">
          {primary.map((item) => {
            const label = navItemLabel(t, item);
            return (
              <BottomIconButton
                key={item.id}
                label={label}
                active={item.isActive}
                onClick={() => navigate(item.href)}
              >
                <NavGlyph icon={item.icon} />
              </BottomIconButton>
            );
          })}
          {showMore ? (
            <BottomIconButton
              label={moreLabel}
              active={moreActive}
              expanded={moreOpen}
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
