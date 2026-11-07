import { useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@/lib/router-adapter";
import { useNavigationData } from "@/hooks/useNavigationData";
import { BottomIconButton } from "./BottomIconButton";
import { BottomNavMoreSheet } from "./BottomNavMoreSheet";
import { PacksAddSheet } from "@/features/packs/components/PacksAddSheet";
import {
  bottomNavGroupName,
  groupWideBottomNav,
  isMoreNavActive,
  navItemLabel,
  bottomNavKey,
  partitionBottomNavigation,
  shouldShowMoreNav,
} from "./bottomNavDestinations";
import { NavGlyph } from "./NavGlyph";

const BOTTOM_NAV_STACK = "calc(5.85rem + env(safe-area-inset-bottom))";

export function BottomIconNav() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { processedSections, canManageSections, getIsActive, packFlags, packFlagsReady } =
    useNavigationData();
  const [moreOpen, setMoreOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);

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
    <>
      <nav
        aria-label={t("nav.main")}
        data-bottom-icon-nav="true"
        data-testid="bottom-nav"
        data-pack-ready={packFlagsReady ? "true" : "false"}
        data-pack-team={packFlags.team ? "true" : "false"}
        data-pack-insights={packFlags.insights ? "true" : "false"}
        data-pack-stock={packFlags.stock ? "true" : "false"}
        className="bottom-icon-nav"
      >
        <div className="bottom-icon-nav-icons border-0 shadow-none">
          <div className="bottom-icon-nav-row">
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
                <div className="bottom-icon-nav-frame">
                  {group.items.map((item) => {
                    const label = navItemLabel(t, item);
                    return (
                      <BottomIconButton
                        key={item.id}
                        label={label}
                        testId={`nav-${bottomNavKey(item.href)}`}
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
                  {group.translationKey === "dailyOperations" ||
                  group.id === "dailyOperations" ? (
                    <BottomIconButton
                      label={t("packs.addMenuTitle")}
                      testId="nav-packs-add"
                      active={packsOpen}
                      expanded={packsOpen}
                      onClick={() => setPacksOpen(true)}
                    >
                      <Plus className="h-6 w-6" aria-hidden="true" />
                    </BottomIconButton>
                  ) : null}
                </div>
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
        </div>
      </nav>

      <PacksAddSheet
        open={packsOpen}
        onOpenChange={setPacksOpen}
        onSelect={(pack) => {
          setPacksOpen(false);
          navigate(`/app/packs/${pack}`);
        }}
      />

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
    </>
  );
}
