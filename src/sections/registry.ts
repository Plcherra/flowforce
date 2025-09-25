import type { PageMeta } from './PageFactory';

export type SectionMeta = {
  title: string;
  slug: string; // e.g., 'events'
  category: 'communication' | 'operations' | 'hr' | 'custom';
  accessLevel?: 'public' | 'team' | 'admin';
  pages: PageMeta[];
};

// Vite will glob-import configs under /src/sections/**/section.config.ts
const configs = import.meta.glob('./**/section.config.ts', { eager: true }) as Record<string, any>;

export const sections: SectionMeta[] = Object.values(configs)
  .map((mod: any) => mod.default as SectionMeta)
  .filter(Boolean);

export function getSectionBySlug(slug: string) {
  return sections.find((s) => s.slug === slug);
}

export function getNavByCategory() {
  const byCat: Record<string, { name: string; href: string; icon: any }[]> = {};
  sections.forEach((s) => {
    const list = byCat[s.category] || (byCat[s.category] = []);
    list.push({ name: s.title, href: `/sections/${s.slug}`, icon: undefined });
  });
  return byCat;
}

