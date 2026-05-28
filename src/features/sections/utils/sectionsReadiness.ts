import type { CustomSection } from "@/hooks/useCustomSections";

export interface SectionsReadinessSummary {
  coreSections: number;
  customSections: number;
  activeCustomSections: number;
  inactiveCustomSections: number;
  customPages: number;
  sectionsWithoutPages: number;
  sectionsWithoutPermissions: number;
  templateBackedSections: number;
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
}

function sectionName(section: CustomSection) {
  return section.name?.trim() || "Untitled section";
}

export function buildSectionsReadinessSummary({
  coreSections,
  customSections,
}: {
  coreSections: number;
  customSections: CustomSection[];
}): SectionsReadinessSummary {
  const activeCustomSections = customSections.filter(
    (section) => section.is_active,
  );
  const inactiveCustomSections = customSections.filter(
    (section) => !section.is_active,
  );
  const customPages = customSections.reduce(
    (sum, section) => sum + (section.pages?.length ?? 0),
    0,
  );
  const sectionsWithoutPages = activeCustomSections.filter(
    (section) => (section.pages?.length ?? 0) === 0,
  );
  const sectionsWithoutPermissions = activeCustomSections.filter(
    (section) => (section.permissions?.length ?? 0) === 0,
  );
  const templateBackedSections = customSections.filter(
    (section) => Boolean(section.template_id),
  );

  const reviewItems = [
    ...sectionsWithoutPages.slice(0, 4).map((section) => ({
      id: `pages-${section.id}`,
      label: "Section has no pages",
      detail: sectionName(section),
      severity: "critical" as const,
    })),
    ...sectionsWithoutPermissions.slice(0, 4).map((section) => ({
      id: `permissions-${section.id}`,
      label: "Section has no permissions",
      detail: sectionName(section),
      severity: "warning" as const,
    })),
    ...inactiveCustomSections.slice(0, 3).map((section) => ({
      id: `inactive-${section.id}`,
      label: "Section inactive",
      detail: sectionName(section),
      severity: "info" as const,
    })),
  ];

  return {
    coreSections,
    customSections: customSections.length,
    activeCustomSections: activeCustomSections.length,
    inactiveCustomSections: inactiveCustomSections.length,
    customPages,
    sectionsWithoutPages: sectionsWithoutPages.length,
    sectionsWithoutPermissions: sectionsWithoutPermissions.length,
    templateBackedSections: templateBackedSections.length,
    reviewItems,
  };
}
