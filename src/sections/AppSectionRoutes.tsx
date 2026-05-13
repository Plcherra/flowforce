import React from "react";
import { sections } from "./registry";

// Statically map section pages without relying on build-time globbing
const pageImports: Record<
  string,
  () => Promise<{ default: React.ComponentType<any> }>
> = {
  "./events/index.tsx": () => import("./events/index"),
};

export function buildSectionRoutes(): React.ReactElement[] {
  const routes: React.ReactElement[] = [];
  for (const sec of sections) {
    const Index = React.lazy(() => {
      const importFn = pageImports[`./${sec.slug}/index.tsx`];
      if (importFn) {
        return importFn() as Promise<{ default: React.ComponentType<any> }>;
      }
      return Promise.resolve({ default: () => <div>Page not found</div> });
    });

    // Add exact route for section index
    routes.push(
      <React.Fragment key={sec.slug}>
        <Index />
      </React.Fragment>,
    );

    // Add catch-all route for section to handle dynamic routing
    routes.push(
      <React.Fragment key={`${sec.slug}-catchall`}>
        <Index />
      </React.Fragment>,
    );

    // Add static page routes
    for (const p of sec.pages) {
      // Skip dynamic routes (those with :param) as they'll be handled by the catch-all
      if (p.slug.includes(":")) continue;

      const fileKey = `./${sec.slug}/${capitalize(p.slug)}.tsx`;
      const Lazy = React.lazy(() => {
        const importFn = pageImports[fileKey];
        if (importFn) {
          return importFn() as Promise<{ default: React.ComponentType<any> }>;
        }
        return Promise.resolve({ default: () => <div>Page not found</div> });
      });
      routes.push(
        <React.Fragment key={`${sec.slug}-${p.slug}`}>
          <Lazy />
        </React.Fragment>,
      );
    }
  }
  return routes;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
