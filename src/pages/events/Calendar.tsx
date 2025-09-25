import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, CalendarDays } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SchedulingCalendar } from '@/components/scheduling/SchedulingCalendar';

export default function EventsCalendarPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');

  return (
    <div>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Events</h1>
                  <p className="text-sm text-muted-foreground">Company events, meetings and calendar</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search events..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button size={isMobile ? 'sm' : 'default'}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isMobile ? '' : 'New Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Event Calendar</h3>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <SchedulingCalendar />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <h3 className="text-sm font-medium">Upcoming Events</h3>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">No events scheduled.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-4 py-3">
                  <h3 className="text-sm font-medium">Quick Actions</h3>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <Button variant="ghost" className="w-full justify-start">Create recurring event</Button>
                  <Button variant="ghost" className="w-full justify-start">Import from Google Calendar</Button>
                  <Button variant="ghost" className="w-full justify-start">Export calendar</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
