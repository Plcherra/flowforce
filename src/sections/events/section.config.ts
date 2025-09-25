import type { SectionMeta } from '@/sections/registry';

const config: SectionMeta = {
  title: 'Events',
  slug: 'events',
  category: 'communication',
  accessLevel: 'team',
  pages: [
  { title: 'Events', slug: 'calendar', type: 'calendar', description: 'Company events and meetings' },
  ],
};

export default config;

