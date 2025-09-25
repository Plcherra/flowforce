import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Video } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEvents } from '@/hooks/useEvents';

function demoMeeting() {
  const start = new Date();
  const end = new Date(start.getTime() + 1000 * 60 * 30);
  return {
    title: 'Demo Team Meeting',
    description: 'A demo meeting created locally.',
    start: start.toISOString(),
    end: end.toISOString(),
    type: 'meeting' as const
  };
}

export default function EventsMeetingsPage() {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');

  const { events, createEvent } = useEvents();
  const meetings = events.filter(e => e.type === 'meeting');
  const filtered = meetings.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-card border border-border rounded-md mb-6 sticky top-4 z-20">
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Meetings</h1>
                <p className="text-sm text-muted-foreground">Upcoming and past meetings</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search meetings..." className="pl-10 w-56" />
              </div>
              <Button size={isMobile ? 'sm' : 'default'}>New Meeting</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {filtered.map(m => (
            <Card key={m.id}>
              <CardHeader className="flex items-center justify-between px-4 py-3">
                <div>
                    <h3 className="text-sm font-medium">{m.title}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(m.start).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">Join</Button>
                  <Button variant="ghost" size="sm">Details</Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-2">
                  <p className="text-sm text-muted-foreground">{m.description || 'No description provided.'}</p>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No meetings found.</p>
                <div className="mt-3">
                  <button
                    className="text-primary underline text-sm"
                    onClick={async () => await createEvent(demoMeeting())}
                  >
                    Create demo meeting
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

