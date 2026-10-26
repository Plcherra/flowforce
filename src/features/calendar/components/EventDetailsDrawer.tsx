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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useTranslation } from "react-i18next";

interface EventDetailsDrawerProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
  onEdit?: () => void;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function EventDetailsDrawer({
  event,
  open,
  onOpenChange,
  onRefresh,
  onEdit,
}: EventDetailsDrawerProps) {
  const { t } = useTranslation();
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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
        title: t("calendar.saved"),
        description: t("calendar.linkedShiftsUpdated"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: t("calendar.unableToLinkShifts"),
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
      setConfirmDelete(false);
      onOpenChange(false);
      onRefresh?.();
    } catch {
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const participants = event?.participants ?? [];

  return (
    <>
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <DrawerContent className="max-h-[95vh]">
        <div className="flex h-full flex-col">
          <DrawerHeader className="border-b px-6 py-4 text-left">
            <DrawerTitle className="text-xl">
              {event?.title || t("calendar.eventDetails")}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {event
                ? `${formatDateTime(event.start)} • ${event.type ?? t("dashboard.event")}`
                : t("calendar.selectEventPrompt")}
            </DrawerDescription>
          </DrawerHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="flex h-full flex-col"
          >
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">{t("schedule.details")}</TabsTrigger>
                <TabsTrigger value="participants">{t("messages.participants2")}</TabsTrigger>
                <TabsTrigger value="shifts">{t("calendar.linkedShifts")}</TabsTrigger>
              </TabsList>
            </div>
            <Separator className="mt-2" />

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <TabsContent value="details" className="space-y-4">
                  {event ? (
                    <>
                      <section>
                        <h3 className="text-sm font-semibold text-foreground">{t("calendar.sessionSummary")}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.description || t("calendar.noDescription")}
                        </p>
                      </section>
                      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">{t("tasks.starts")}</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(event.start, "EEE, MMM d · HH:mm")}
                          </p>
                        </div>
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">{t("tasks.ends")}</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(
                              event.end ?? null,
                              "EEE, MMM d · HH:mm",
                            )}
                          </p>
                        </div>
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">{t("schedule.location")}</p>
                          <p className="text-muted-foreground">
                            {event.location || t("calendar.notSpecified")}
                          </p>
                        </div>
                        <div className="rounded-md border p-3 text-sm">
                          <p className="font-semibold text-foreground">{t("calendar.eventType")}</p>
                          <p className="capitalize text-muted-foreground">
                            {event.type ?? t("dashboard.event")}
                          </p>
                        </div>
                      </section>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("calendar.noEventSelected")}</p>
                  )}
                </TabsContent>

                <TabsContent value="participants" className="space-y-3">
                  {participants.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{t("calendar.noParticipantsRecordedForThisEvent")}</div>
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
                          {participant.responseStatus ?? t("calendar.invited")}
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
                    <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{t("calendar.linkedShiftsWillSyncOnceThisEventIs")}</div>
                  )}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {Array.isArray(links) && links.length > 0 &&
                      links.map((link: any) => (
                        <div
                          key={link?.id || Math.random()}
                          className="rounded-md border px-3 py-2"
                        >
                          <p className="font-semibold text-foreground">
                            {link?.shift?.title || t("calendar.shiftFallback")}
                          </p>
                          <p>{timeRange(link?.shift)}</p>
                        </div>
                      ))}
                    {links.length === 0 && fallbackShiftIds.length > 0 && (
                      <div className="rounded-md border px-3 py-2">
                        <p className="font-semibold text-foreground">{t("calendar.linkedShifts2")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("calendar.shiftsLinkedCount", {
                            count: fallbackShiftIds.length,
                          })}
                        </p>
                      </div>
                    )}
                    {linksLoading && <div>{t("calendar.updatingLinkedShifts")}</div>}
                  </div>
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-xs text-muted-foreground">
              {busy
                ? t("calendar.working")
                : event
                  ? t("calendar.createdOn", {
                      when: formatDateTime(
                        event.raw.created_at ?? undefined,
                        "EEE, MMM d · HH:mm",
                      ),
                    })
                  : t("calendar.eventDetails")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >{t("common.close")}</Button>
              {onEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="calendar-edit-event"
                  onClick={onEdit}
                  disabled={!eventId || busy}
                >{t("common.edit")}</Button>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                data-testid="calendar-delete-event"
                onClick={() => setConfirmDelete(true)}
                disabled={!eventId || busy}
              >{t("common.delete")}</Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("calendar.deleteThisEvent")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("calendar.deleteEventQuestion")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="calendar-confirm-delete"
              disabled={busy}
              onClick={(click) => {
                click.preventDefault();
                void handleDelete();
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const timeRange = (
  shift?: { start_time?: string; end_time?: string } | null,
) => {
  if (!shift?.start_time || !shift?.end_time) return "";
  const start = parseISO(shift.start_time);
  const end = parseISO(shift.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "";
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
};
