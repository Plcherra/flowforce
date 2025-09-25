import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Video } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function EventsMeetingsPage() {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');

  const meetings = [
    { id: '1', title: 'Weekly All-Hands', time: 'Sep 10 • 10:00 AM', organizer: 'Leadership' },
    { id: '2', title: 'Product Sync', time: 'Sep 11 • 2:00 PM', organizer: 'Product' },
    { id: '3', title: 'Hiring Panel', time: 'Sep 15 • 11:00 AM', organizer: 'People Ops' }
  ];

  const filtered = meetings.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Meetings</h1>
                <p className="text-sm text-muted-foreground">Upcoming and past meetings</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Search meetings..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 w-64" />
              </div>
              <Button size={isMobile ? 'sm' : 'default'}>New Meeting</Button>
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(m => (
              <Card key={m.id}>
                <CardHeader className="flex items-center justify-between px-4 py-3">
                  <div>
                    <h3 className="text-sm font-medium">{m.title}</h3>
                    <p className="text-xs text-muted-foreground">{m.time} • {m.organizer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">Join</Button>
                    <Button variant="ghost" size="sm">Details</Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  <p className="text-sm text-muted-foreground">No description provided.</p>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No meetings found.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
