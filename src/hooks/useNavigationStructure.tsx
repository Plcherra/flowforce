import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { isLeadershipLevel } from "@/features/scheduling/utils/leadershipLevel";
import { isPackEnabled, packForNavSection, packRequiredForPath, type PackId } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useCustomSections } from "@/hooks/useCustomSections";
import { navigationSections } from "@/data/navigationData";
import { getNavByCategory } from "@/sections/registry";

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
  const { sections: customSections } = useCustomSections();

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

  // Filter and deduplicate custom sections
  const getFilteredCustomSections = (categoryKey: string) => {
    return (
      customSections
        .filter(
          (customSection) =>
            customSection.category === categoryKey && customSection.is_active,
        )
        // Remove unwanted sections
        .filter((cs) => {
          const name = (cs.name || "").toLowerCase();
          return (
            !name.includes("simple inventory") &&
            !name.includes("events") &&
            !name.includes("calendar")
          );
        })
        // Deduplicate by path
        .reduce((unique: any[], curr) => {
          const exists = unique.some(
            (u) =>
              (u.path || "").toLowerCase() === (curr.path || "").toLowerCase(),
          );
          return exists ? unique : [...unique, curr];
        }, [])
    );
  };

  // Filter file-based sections to avoid duplicates
  const getFilteredFileSections = (
    categoryKey: string,
    existingPaths: Set<string>,
  ) => {
    const dynamic = getNavByCategory()[categoryKey] || [];
    const customSlugs = new Set(
      customSections.map(
        (cs) => (cs.path || "").replace(/^\//, "").split("/")[0],
      ),
    );

    return dynamic.filter((it) => {
      const slug = (it.href || "").split("/")[2] || "";
      const path = canonicalizePath(it.href || "");
      const itemName = (it.name || "").toLowerCase();

      return (
        !customSlugs.has(slug) &&
        !existingPaths.has(path) &&
        !itemName.includes("simple inventory") &&
        !itemName.includes("events") &&
        !itemName.includes("calendar")
      );
    });
  };

  const navigationStructure: NavigationSection[] = useMemo(() => {
    const includedPaths = new Set<string>();

    return navigationSections
      .filter((section) => isSectionVisible(section))
      .map((section) => {
        const sectionPack = packForNavSection(section.translationKey);
        const sectionOpen =
          !sectionPack || isPackEnabled(packFlags.flags, sectionPack);
        // Process static navigation items
        const staticItems: NavigationItem[] = section.items
          .filter((item) => isItemVisible(item))
          .map((item) => ({
            id: `static-${item.href}`,
            name: item.name,
            href: item.href,
            icon: item.icon,
            translationKey: item.translationKey,
          }));

        const staticNames = new Set(
          staticItems
            .map((item) => (item.name || "").trim().toLowerCase())
            .filter(Boolean),
        );

        // Get canonical paths to avoid duplicates
        const canonicalPaths = new Set(
          section.items.map((item) => canonicalizePath(item.href)),
        );

        // Process custom sections
        const customItems: NavigationItem[] = getFilteredCustomSections(
          section.translationKey,
        )
          .map((customSection) => {
            const rawPath = (customSection.path || "").trim();
            if (!rawPath) {
              return null;
            }

            const resolvedPath =
              rawPath.startsWith("/") || rawPath.startsWith("http")
                ? rawPath
                : `/${rawPath}`;

            if (
              !sectionOpen &&
              !isDirectoryItem({ name: customSection.name, href: resolvedPath })
            ) {
              return null;
            }

            const canonical = canonicalizePath(resolvedPath);
            const canonicalTail = canonical.split("/").pop() || "";
            const normalizedName = (customSection.name || "")
              .trim()
              .toLowerCase();
            const templateKey = (customSection.template_id || "")
              .toString()
              .toLowerCase();

            if (
              !canonical ||
              canonicalPaths.has(canonical) ||
              staticNames.has(normalizedName)
            ) {
              return null;
            }

            if (
              canonicalTail === "company-updates" ||
              normalizedName === "company updates"
            ) {
              return null;
            }

            if (
              templateKey === "help-desk" ||
              canonical.includes("help-desk") ||
              normalizedName.includes("help desk")
            ) {
              return null;
            }

            let href = resolvedPath;
            if (
              canonicalTail === "employee-directory" ||
              normalizedName === "employee directory"
            ) {
              if (!can("directory.view")) return null;
              href = "/employees";
            }

            canonicalPaths.add(canonical);

            return {
              id: `custom-${customSection.id}`,
              name: customSection.name || "Unnamed Section",
              href,
              icon: customSection.icon,
            };
          })
          .filter((item): item is NavigationItem => item !== null);

        // Process file-based sections
        const fileItems: NavigationItem[] = getFilteredFileSections(
          section.translationKey,
          canonicalPaths,
        )
          .map((fileSection) => {
            const canonical = canonicalizePath(fileSection.href || "");
            if (
              !sectionOpen &&
              !isDirectoryItem({ name: fileSection.name, href: fileSection.href })
            ) {
              return null;
            }
            const canonicalTail = canonical.split("/").pop() || "";
            const normalizedName = (fileSection.name || "")
              .trim()
              .toLowerCase();

            if (
              !canonical ||
              canonicalPaths.has(canonical) ||
              staticNames.has(normalizedName)
            ) {
              return null;
            }

            if (
              canonicalTail === "company-updates" ||
              normalizedName === "company updates"
            ) {
              return null;
            }

            canonicalPaths.add(canonical);

            return {
              id: `file-${fileSection.href}`,
              name: fileSection.name,
              href: fileSection.href,
              icon: fileSection.icon,
            } as NavigationItem;
          })
          .filter((item): item is NavigationItem => item !== null);

        const combinedItems = [
          ...staticItems,
          ...customItems,
          ...fileItems,
        ].filter((item) => {
          if (isDirectoryItem(item) && !can("directory.view")) return false;
          if (blockedByPack(item)) return false;
          if (!leadership && isLeadershipItem(item)) return false;
          const canonical = canonicalizePath(item.href);
          if (!canonical) {
            return false;
          }
          if (includedPaths.has(canonical)) {
            return false;
          }
          includedPaths.add(canonical);
          return true;
        });

        return {
          id: section.translationKey,
          title: section.title,
          translationKey: section.translationKey,
          items: combinedItems,
        };
      })
      .filter((section) => section.items.length > 0); // Only include sections with visible items
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [customSections, hasRole, can, featureFlags, leadership, packFlags.flags]);

  const canManageSections =
    can("systemSettings") || hasRole(["company_admin", "owner", "admin"]);

  return {
    navigationStructure,
    canManageSections,
    packFlags: packFlags.flags,
    packFlagsReady: packFlags.isReady,
  };
}
