import React from 'react';
import { CalendarPage } from './templates/CalendarPage';
import { TablePage } from './templates/TablePage';
import { FormPage } from './templates/FormPage';

export type PageMeta = {
  title: string;
  slug: string;
  type: 'calendar' | 'table' | 'form' | 'video' | 'custom';
  layout?: 'default' | 'full';
  accessLevel?: 'public' | 'team' | 'admin';
  description?: string;
};

export function PageFactory({ page }: { page: PageMeta }) {
  switch (page.type) {
    case 'calendar':
      return <CalendarPage title={page.title} description={page.description} />;
    case 'table':
      return <TablePage title={page.title} description={page.description} />;
    case 'form':
      return <FormPage title={page.title} description={page.description} />;
    case 'custom':
    default:
      return <div className="text-sm text-muted-foreground">This page is a placeholder. Add components later.</div>;
  }
}

