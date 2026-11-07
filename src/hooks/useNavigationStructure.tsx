import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { isLeadershipLevel } from "@/features/scheduling/utils/leadershipLevel";
import { isPackEnabled, packRequiredForPath, type PackId } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { navigationSections } from "@/data/navigationData";

export interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: any;
  translationKey?: string;
}

export interface NavigationSection {
  id: string;
  title: string;
  translationKey: string;
  items: NavigationItem[];
}

const canonicalizePath = (href: string) => {
  if (!href) {
    return "";
  }

  const [path] = href.split("?");
  const segments = path
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (segments[0] === "app") {
    segments.shift();
  }

  return segments.join("/");
};

export function useNavigationStructure() {
  const { hasRole } = usePermissions();
  const { can } = useCan();
  const { profile } = useProfile();
  const leadership = isLeadershipLevel({ name: profile?.role });
  const featureFlags = useFeatureFlags();
  const packFlags = usePackFlags();

  const isDirectoryItem = (item: { name?: string; href?: string }) => {
    const name = (item.name || "").trim().toLowerCase();
    const href = canonicalizePath(item.href || "");
    return (
      href === "employees" ||
      name === "team directory" ||
      name === "employee directory"
    );
  };

  const isLeadershipItem = (item: { name?: string; href?: string }) => {
    const name = (item.name || "").trim().toLowerCase();
    const href = canonicalizePath(item.href || "");
    return href === "ai-insights" || name === "ai insights";
  };

  const blockedByPack = (item: { href?: string; name?: string; pack?: PackId }) => {
    if (isDirectoryItem(item)) return false;
    if (item.pack && item.pack !== "ops" && !isPackEnabled(packFlags.flags, item.pack)) {
      return true;
    }
    const required = packRequiredForPath(item.href || "");
    return Boolean(required && !isPackEnabled(packFlags.flags, required));
  };

  const isItemVisible = (item: any) => {
    if (isDirectoryItem(item)) return can("directory.view");
    if (!leadership && isLeadershipItem(item)) return false;
    if (blockedByPack(item)) return false;
    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permission && !can(item.permission as any)) return false;
    if (item.featureFlag && !featureFlags.isEnabled(item.featureFlag))
      return false;
    return true;
  };

  const isSectionVisible = (section: any) => {
    if (section.roles && !hasRole(section.roles)) return false;
    if (section.permission && !can(section.permission as any)) return false;
    if (section.items.some((item: unknown) => isItemVisible(item))) return true;
    return (
      section.translationKey === "team" ||
      section.translationKey === "dailyOperations"
    );
  };

  const navigationStructure: NavigationSection[] = useMemo(() => {
    const includedPaths = new Set<string>();

    return navigationSections
      .filter((section) => isSectionVisible(section))
      .map((section) => {
        const staticItems: NavigationItem[] = section.items
          .filter((item) => isItemVisible(item))
          .map((item) => ({
            id: `static-${item.href}`,
            name: item.name,
            href: item.href,
            icon: item.icon,
            translationKey: item.translationKey,
          }));

        const items = staticItems.filter((item) => {
          if (isDirectoryItem(item) && !can("directory.view")) return false;
          if (blockedByPack(item)) return false;
          if (!leadership && isLeadershipItem(item)) return false;
          const canonical = canonicalizePath(item.href);
          if (!canonical || includedPaths.has(canonical)) return false;
          includedPaths.add(canonical);
          return true;
        });

        return {
          id: section.translationKey,
          title: section.title,
          translationKey: section.translationKey,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
    // Built-in sections only. Custom sections stay in the database and are ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [hasRole, can, featureFlags, leadership, packFlags.flags]);

  return {
    navigationStructure,
    canManageSections: false,
    packFlags: packFlags.flags,
    packFlagsReady: packFlags.isReady,
  };
}
