import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, Search, Video, Wrench } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SchedulingCalendar } from '@/components/scheduling/SchedulingCalendar';
import { ShiftDetailsPanel } from '@/components/scheduling/ShiftDetailsPanel';
import { SchedulingProvider } from '@/contexts/SchedulingContext';
import { CreateVendorVisitDialog } from '@/components/events/CreateVendorVisitDialog';
import { useEvents } from '@/hooks/useEvents';

export default function EventsHubPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const { events, createEvent } = useEvents();
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter(e => {
        const t = new Date(e.start).getTime();
        const match = (e.title || '').toLowerCase().includes(search.toLowerCase());
        return t >= now && match;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 8);
  }, [events, search]);

  const quickCreate = async (kind: 'meeting' | 'event') => {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    await createEvent({
      title: kind === 'meeting' ? 'New Meeting' : 'New Event',
      description: kind === 'meeting' ? 'Quick-created meeting' : 'Quick-created event',
      start: start.toISOString(),
      end: end.toISOString(),
      type: kind,
    });
  };

  return (
    <div>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Events & Meetings</h1>
                  <p className="text-sm text-muted-foreground">Plan, manage and track all sessions</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search upcoming..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => quickCreate('meeting')}>
                    <Video className="h-4 w-4 mr-2" />
                    {isMobile ? '' : 'New Meeting'}
                  </Button>
                  <Button size={isMobile ? 'sm' : 'default'} onClick={() => quickCreate('event')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isMobile ? '' : 'New Event'}
                  </Button>
                  <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => setVendorDialogOpen(true)}>
                    <Wrench className="h-4 w-4 mr-2" />
                    {isMobile ? '' : 'Vendor Visit'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Calendar</h3>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <SchedulingProvider>
                    <SchedulingCalendar
                      hideShiftActions
                      externalDetails
                      onShiftSelect={setSelectedShiftId}
                    />
                  </SchedulingProvider>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <h3 className="text-sm font-medium">Upcoming</h3>
                </CardHeader>
                <CardContent className="p-2">
                  {upcoming.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">No upcoming items.</div>
                  )}
                  <ul className="space-y-2">
                    {upcoming.map((e) => (
                      <li key={e.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{e.title}</div>
                            <div className="text-xs text-muted-foreground">{new Date(e.start).toLocaleString()}</div>
                          </div>
                          <Badge variant="outline" className="capitalize">{e.type || 'event'}</Badge>
                        </div>
                        {e.description && (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{e.description}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {selectedShiftId && (
                <Card>
                  <CardHeader className="px-4 py-3">
                    <h3 className="text-sm font-medium">Shift Details</h3>
                  </CardHeader>
                  <CardContent className="p-0">
                    <SchedulingProvider>
                      <ShiftDetailsPanel
                        shiftId={selectedShiftId}
                        onClose={() => setSelectedShiftId(null)}
                      />
                    </SchedulingProvider>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <SchedulingProvider>
        <CreateVendorVisitDialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen} />
      </SchedulingProvider>
    </div>
  );
}
