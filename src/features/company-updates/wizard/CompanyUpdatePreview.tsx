import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { WizardFormData } from './types';

interface CompanyUpdatePreviewProps {
  data: WizardFormData;
  device?: 'desktop' | 'mobile';
  className?: string;
  showMeta?: boolean;
}

export function CompanyUpdatePreview({
  data,
  device = 'desktop',
  className,
  showMeta = true,
}: CompanyUpdatePreviewProps) {
  const { backgroundStyle } = data;

  const background =
    backgroundStyle.type === 'gradient'
      ? `linear-gradient(135deg, ${backgroundStyle.primary}, ${backgroundStyle.secondary})`
      : backgroundStyle.primary;

  const isMobile = device === 'mobile';

  const frameClasses = cn(
    'relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow',
    isMobile ? 'mx-auto max-w-[320px]' : 'w-full',
    className,
  );

  return (
    <div className={frameClasses}>
      {isMobile && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 py-2">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>
      )}
      <div
        className={cn(
          'relative px-5 py-6 text-white',
          isMobile ? 'min-h-[140px] pt-10' : 'min-h-[160px]',
        )}
        style={{ background }}
      >
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative z-10 space-y-3">
          <Badge variant="secondary" className="bg-white/20 text-white">
            {data.type}
          </Badge>
          <h2 className="text-xl font-semibold line-clamp-2">{data.title || 'Untitled update'}</h2>
        </div>
      </div>
      <CardContent className={cn('space-y-4', isMobile ? 'px-4 py-4' : 'px-6 py-5')}>
        <p className="text-sm text-muted-foreground line-clamp-4">
          {data.content || 'Use the fields on the left to start writing your announcement.'}
        </p>

        {showMeta && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {data.publishingSettings.authorAttribution
                ? `By ${data.publishingSettings.authorName || 'You'}`
                : 'Sent anonymously'}
            </span>
            <div className="flex flex-wrap gap-2">
              {data.publishingSettings.engagement.allowLikes && <Badge variant="outline">Likes</Badge>}
              {data.publishingSettings.engagement.allowComments && (
                <Badge variant="outline">Comments</Badge>
              )}
              {data.publishingSettings.engagement.allowSharing && <Badge variant="outline">Sharing</Badge>}
              {data.publishingSettings.engagement.requireConfirmation && (
                <Badge variant="outline">Read receipt</Badge>
              )}
              {data.publishingSettings.engagement.showAsPopup && (
                <Badge variant="outline">Popup</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
