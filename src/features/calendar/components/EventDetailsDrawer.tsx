import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEventLinks } from "@/hooks/useEventLinks";
import { useEvents } from "@/hooks/useEvents";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { upsertEventShiftLinks } from "@/hooks/useCalendarEvents";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/shared/utils";
import { parseISO, format } from "date-fns";
import { LinkShiftsPanel } from "./LinkShiftsPanel";

interface EventDetailsDrawerProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function EventDetailsDrawer({
  event,
  open,
  onOpenChange,
  onRefresh,
}: EventDetailsDrawerProps) {
  const eventId = event?.id ?? null;
  const { deleteEvent } = useEvents();
  const { toast } = useToast();
  const canManageLinks = Boolean(eventId && UUID_PATTERN.test(eventId));
  const {
    links,
    loading: linksLoading,
    error: linksError,
    refresh,
  } = useEventLinks(canManageLinks ? eventId : null);
  const [activeTab, setActiveTab] = useState<
    "details" | "participants" | "shifts"
  >("details");
  const [busy, setBusy] = useState(false);
  const [localShiftIds, setLocalShiftIds] = useState<string[]>([]);

  useEffect(() => {
    setLocalShiftIds(event?.shiftIds ?? []);
  }, [event?.id, event?.shiftIds]);

  const fallbackShiftIds = useMemo(() => localShiftIds, [localShiftIds]);
  const linkedShiftIds = useMemo(() => {
    if (links.length > 0) {
      return links.map((link) => link.shift_id);
    }
    return fallbackShiftIds;
  }, [links, fallbackShiftIds]);

  const handleLinkUpdate = async (next: string[]) => {
    if (!eventId) return;
    setLocalShiftIds(next);
    setBusy(true);
    try {
      if (canManageLinks) {
        const companyId = event?.raw?.company_id ?? null;
        await upsertEventShiftLinks({
          eventId,
          shiftIds: next,
          companyId,
        });
        await refresh();
      }
      onRefresh?.();
      toast({
        title: "Saved",
        description: "Linked shifts updated.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Unable to link shifts",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    setBusy(true);
    try {
      await deleteEvent(eventId);
      onOpenChange(false);
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const participants = event?.participants ?? [];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <DrawerContent className="max-h-[95vh]">
        <div className="flex h-full flex-col">
          <DrawerHeader className="border-b px-6 py-4 text-left">
            <DrawerTitle className="text-xl">
              {event?.title || "Event details"}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {event
                ? `${formatDateTime(event.start)} • ${event.type ?? "event"}`
                : "Select an event to inspect details."}
            </DrawerDescription>
          </DrawerHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="flex h-full flex-col"
          >
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="shifts">Linked Shifts</TabsTrigger>
              </TabsList>
            </div>
            <Separator className="mt-2" />

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <TabsContent value="details" className="space-y-4">
                  {event ? (
                    <>
                      <section>
                        <h3 className="text-sm font-semibold text-foreground">
                          Session summary
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.description || "No description provided."}
                        </p>
                      </section>
                      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">
                            Starts
                          </p>
                          <p className="text-muted-foreground">
                            {formatDateTime(event.start, "EEE, MMM d · HH:mm")}
                          </p>
                        </div>
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">Ends</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(
                              event.end ?? null,
                              "EEE, MMM d · HH:mm",
                            )}
                          </p>
                        </div>
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">
                            Location
                          </p>
                          <p className="text-muted-foreground">
                            {event.location || "Not specified"}
                          </p>
                        </div>
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">
                            Event type
                          </p>
                          <p className="capitalize text-muted-foreground">
                            {event.type ?? "event"}
                          </p>
                        </div>
                      </section>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No event selected.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="participants" className="space-y-3">
                  {participants.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No participants recorded for this event.
                    </div>
                  ) : (
                    participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {participant.name}
                          </p>
                          {participant.role && (
                            <p className="text-xs text-muted-foreground">
                              {participant.role}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                          {participant.responseStatus ?? "Invited"}
                        </Badge>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="shifts" className="space-y-3">
                  {linksError && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      {linksError}
                    </div>
                  )}
                  <LinkShiftsPanel
                    eventDate={event?.start ?? new Date().toISOString()}
                    storeId={event?.storeId ?? null}
                    linkedShiftIds={linkedShiftIds}
                    onChange={handleLinkUpdate}
                    disabled={!eventId || busy || linksLoading}
                    busy={busy || linksLoading}
                  />
                  {!canManageLinks && eventId && (
                    <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Linked shifts will sync once this event is saved to the
                      calendar.
                    </div>
                  )}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {Array.isArray(links) && links.length > 0 &&
                      links.map((link: any) => (
                        <div
                          key={link?.id || Math.random()}
                          className="rounded-md border px-3 py-2"
                        >
                          <p className="font-semibold text-foreground">
                            {link?.shift?.title || "Shift"}
                          </p>
                          <p>{timeRange(link?.shift)}</p>
                        </div>
                      ))}
                    {links.length === 0 && fallbackShiftIds.length > 0 && (
                      <div className="rounded-md border px-3 py-2">
                        <p className="font-semibold text-foreground">
                          Linked shifts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fallbackShiftIds.length} shift
                          {fallbackShiftIds.length === 1 ? "" : "s"} linked
                          locally.
                        </p>
                      </div>
                    )}
                    {linksLoading && <div>Updating linked shifts…</div>}
                  </div>
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-xs text-muted-foreground">
              {busy
                ? "Working…"
                : event
                  ? `Created ${formatDateTime(event.raw.created_at ?? undefined, "EEE, MMM d · HH:mm")}`
                  : "Idle"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={!eventId || busy}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const timeRange = (
  shift?: { start_time?: string; end_time?: string } | null,
) => {
  if (!shift?.start_time || !shift?.end_time) return "No time set";
  const start = parseISO(shift.start_time);
  const end = parseISO(shift.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "No time set";
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
};
