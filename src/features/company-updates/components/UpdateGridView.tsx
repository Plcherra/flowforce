import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin } from 'lucide-react';
import type { CompanyUpdate } from '@/types/companyUpdates';
import { getBackgroundCss, getTypeColor } from '@/features/company-updates/utils';

interface UpdateGridViewProps {
  updates: CompanyUpdate[];
}

export function UpdateGridView({ updates }: UpdateGridViewProps) {
  return (
    <div className="px-4 py-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {updates.map((update) => (
        <Card key={update.id} className="overflow-hidden">
          {update.backgroundStyle && (
            <div className="h-16" style={{ background: getBackgroundCss(update.backgroundStyle) }} />
          )}
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge className={`text-xs ${getTypeColor(update.type)}`}>{update.type}</Badge>
              {update.isPinned && <Pin className="h-3 w-3 text-primary" />}
            </div>
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{update.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-3">{update.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
