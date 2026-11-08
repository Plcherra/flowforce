import type React from "react";
import type { PageMeta } from "./PageFactory";

export type SectionMeta = {
  title: string;
  slug: string;
  category: "communication" | "operations" | "hr" | "custom";
  accessLevel?: "public" | "team" | "admin";
  pages: PageMeta[];
};

export const sections: SectionMeta[] = [];

export function getSectionBySlug(slug: string) {
  return sections.find((s) => s.slug === slug);
}

export function getNavByCategory() {
  const byCat: Record<
    string,
    { name: string; href: string; icon: React.ReactNode | undefined }[]
  > = {};
  sections.forEach((s) => {
    const list = byCat[s.category] || (byCat[s.category] = []);
    list.push({ name: s.title, href: `/sections/${s.slug}`, icon: undefined });
  });
  return byCat;
}
