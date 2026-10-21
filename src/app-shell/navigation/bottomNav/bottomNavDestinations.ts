import { BarChart3 } from "lucide-react";
import type {
  ProcessedNavigationItem,
  ProcessedNavigationSection,
} from "@/hooks/useNavigationData";

/** Destinations that stay on the icon row. Everything else opens from More. */
export const PRIMARY_BOTTOM_NAV_ORDER = [
  "dashboard",
  "enhanced-scheduling",
  "tasks",
  "messages",
  "employees",
] as const;

const PRIMARY_KEYS = new Set<string>(PRIMARY_BOTTOM_NAV_ORDER);

export function bottomNavKey(href: string): string {
  const path = href.split("?")[0] ?? href;
  const segments = path
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (segments[0] === "app") {
    segments.shift();
  }

  return segments[segments.length - 1] ?? "";
}

export function createDashboardNavItem(isActive: boolean): ProcessedNavigationItem {
  return {
    id: "primary-dashboard",
    name: "Dashboard",
    href: "/app/dashboard",
    icon: BarChart3,
    translationKey: "dashboard",
    isActive,
  };
}

type LabelTranslator = (key: string) => string;

export function navItemLabel(
  t: LabelTranslator,
  item: { name: string; translationKey?: string },
): string {
  if (!item.translationKey) return item.name;

  const navKey = `navigation.${item.translationKey}`;
  const navLabel = t(navKey);
  if (navLabel !== navKey) return navLabel;

  const commonKey = `common.${item.translationKey}`;
  const commonLabel = t(commonKey);
  if (commonLabel !== commonKey) return commonLabel;

  return item.name;
}

export function navSectionLabel(
  t: LabelTranslator,
  section: { title: string; translationKey?: string },
): string {
  const translationKey = section.translationKey || "custom";
  const navKey = `navigation.${translationKey}`;
  const navLabel = t(navKey);
  if (navLabel !== navKey) return navLabel;
  return section.title || translationKey;
}

export function partitionBottomNavigation(
  sections: ProcessedNavigationSection[],
  dashboardActive: boolean,
): {
  primary: ProcessedNavigationItem[];
  moreSections: ProcessedNavigationSection[];
} {
  const primaryByKey = new Map<string, ProcessedNavigationItem>();
  const moreSections: ProcessedNavigationSection[] = [];

  for (const section of sections) {
    const moreItems: ProcessedNavigationItem[] = [];

    for (const item of section.items ?? []) {
      const key = bottomNavKey(item.href);
      if (PRIMARY_KEYS.has(key) && !primaryByKey.has(key)) {
        primaryByKey.set(key, item);
        continue;
      }
      moreItems.push(item);
    }

    if (moreItems.length > 0) {
      moreSections.push({ ...section, items: moreItems });
    }
  }

  const primary: ProcessedNavigationItem[] = [createDashboardNavItem(dashboardActive)];

  for (const key of PRIMARY_BOTTOM_NAV_ORDER) {
    if (key === "dashboard") continue;
    const item = primaryByKey.get(key);
    if (item) primary.push(item);
  }

  return { primary, moreSections };
}

export function shouldShowMoreNav(
  moreSections: ProcessedNavigationSection[],
  canManageSections: boolean,
): boolean {
  if (canManageSections) return true;
  return moreSections.some((section) => section.items.length > 0);
}

export function isMoreNavActive(moreSections: ProcessedNavigationSection[]): boolean {
  return moreSections.some((section) => section.items.some((item) => item.isActive));
}

/** Every visible page, in sidebar order, for the wide icon row. */
export function wideBottomNavItems(
  primary: ProcessedNavigationItem[],
  moreSections: ProcessedNavigationSection[],
): ProcessedNavigationItem[] {
  const seen = new Set<string>();
  const items: ProcessedNavigationItem[] = [];

  for (const item of [...primary, ...moreSections.flatMap((section) => section.items)]) {
    const key = item.id || bottomNavKey(item.href);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items;
}
