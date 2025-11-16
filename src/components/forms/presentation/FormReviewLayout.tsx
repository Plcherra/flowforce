import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FormMetaCard, type FormMetaCardProps } from './FormMetaCard';
import { FormSection } from './FormSection';

export interface FormReviewLayoutSection {
  id: string;
  title: string;
  content: ReactNode;
}

export interface FormReviewLayoutProps {
  headerTitle?: string;
  headerSubtitle?: string;
  meta: FormMetaCardProps;
  sections: FormReviewLayoutSection[];
  className?: string;
}

export function FormReviewLayout({ headerTitle, headerSubtitle, meta, sections, className }: FormReviewLayoutProps) {
  return (
    <div className={cn('space-y-6 bg-background px-6 py-8 text-foreground sm:px-10', className)}>
      <header className="space-y-1 border-b border-border/70 pb-4">
        {headerTitle && <h1 className="text-2xl font-bold text-foreground">{headerTitle}</h1>}
        {headerSubtitle && <p className="text-sm text-muted-foreground">{headerSubtitle}</p>}
      </header>

      <FormMetaCard {...meta} />

      <div className="space-y-5">
        {sections.map((section) => (
          <FormSection key={section.id} title={section.title}>
            {section.content}
          </FormSection>
        ))}
      </div>
    </div>
  );
}
