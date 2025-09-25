#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const sectionsDir = path.join(root, 'src', 'sections');

const TEMPLATES = {
  'simple-inventory': {
    title: 'Simple Inventory',
    slug: 'simple-inventory',
    category: 'operations',
    pages: [
      { title: 'Items', slug: 'items', type: 'table', description: 'Basic inventory list' },
    ],
  },
};

function pascalCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function writeFileSafe(filepath, content) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, content, 'utf8');
}

function sectionConfig(meta) {
  const { title, slug, category, pages } = meta;
  return `import type { SectionMeta } from '@/sections/registry';

const config: SectionMeta = ${'`'}${'${'}JSON.stringify({ title, slug, category, accessLevel: 'team', pages }, null, 2)${'}'}${'`'} as any;

export default config;
`;
}

function indexTsx(slug) {
  return `import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import config from './section.config';

export default function ${'${'}pascalCase(slug)${'}'}Index() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-4">{config.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.pages.map((p) => (
            <Card key={p.slug}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link className="text-primary underline" to={`/sections/${'${'}slug${'}'}/${'${'}'${'}'}p.slug}`}>Open {p.title}</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
`;
}

function pageTsx(slug, pageSlug) {
  return `import Layout from '@/components/Layout';
import config from './section.config';
import { PageFactory } from '@/sections/PageFactory';

export default function ${'${'}pascalCase(slug)${'}'}${'${'}pascalCase(pageSlug)${'}'}Page() {
  const page = config.pages.find((p) => p.slug === '${'${'}pageSlug${'}'}')!;
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageFactory page={page as any} />
      </div>
    </Layout>
  );
}
`;
}

function main() {
  const [, , input] = process.argv;
  if (!input) {
    console.error('Usage: node scripts/generate-section.mjs <templateId|slug>');
    process.exit(1);
  }

  let meta = TEMPLATES[input];
  if (!meta) {
    meta = {
      title: pascalCase(input),
      slug: input,
      category: 'custom',
      pages: [{ title: 'Overview', slug: 'overview', type: 'custom', description: 'Starter page' }],
    };
  }

  const dir = path.join(sectionsDir, meta.slug);
  writeFileSafe(path.join(dir, 'section.config.ts'), sectionConfig(meta));
  writeFileSafe(path.join(dir, 'index.tsx'), indexTsx(meta.slug));
  for (const p of meta.pages) {
    writeFileSafe(path.join(dir, `${pascalCase(p.slug)}.tsx`), pageTsx(meta.slug, p.slug));
  }

  console.log(`Section scaffolded: ${meta.slug}`);
}

main();

