import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

type Props = { title?: string; description?: string };

export function CalendarPage({ title = 'Calendar', description }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {description || 'This is a starter calendar view. Hook up your data source to show events.'}
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="border rounded h-16" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

