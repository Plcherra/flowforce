import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEvents, type AppEvent } from "@/hooks/useEvents";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import {
  fromDatetimeLocalValue,
  isEndAfterStart,
  toDatetimeLocalValue,
} from "@/features/calendar/utils/calendarBoard";

type SessionType = "meeting" | "event" | "vendor_visit";

interface EditEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (event: AppEvent) => void;
}

function vendorNameOf(event: CalendarEvent | null): string {
  const vendor = event?.raw.vendor;
  if (!vendor || typeof vendor !== "object" || Array.isArray(vendor)) return "";
  const name = (vendor as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

function serviceTypeOf(event: CalendarEvent | null): string {
  const vendor = event?.raw.vendor;
  if (!vendor || typeof vendor !== "object" || Array.isArray(vendor)) return "";
  const service = (vendor as { service_type?: unknown }).service_type;
  return typeof service === "string" ? service : "";
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onSaved,
}: EditEventDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { updateEvent } = useEvents();
  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("event");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    const type = event.type;
    setSessionType(
      type === "meeting" || type === "vendor_visit" || type === "event" ? type : "event",
    );
    setTitle(event.title ?? "");
    setLocation(event.location ?? "");
    setDescription(event.description ?? "");
    setVendorName(vendorNameOf(event));
    setServiceType(serviceTypeOf(event));
    const startDate = new Date(event.start);
    const endDate = event.end ? new Date(event.end) : null;
    setStart(Number.isNaN(startDate.getTime()) ? "" : toDatetimeLocalValue(startDate));
    setEnd(
      endDate && !Number.isNaN(endDate.getTime()) ? toDatetimeLocalValue(endDate) : "",
    );
  }, [event, open]);

  const handleSave = async () => {
    if (!event) return;
    const startDate = fromDatetimeLocalValue(start);
    const endDate = fromDatetimeLocalValue(end);
    if (!title.trim() || !startDate || !endDate) {
      toast({
        title: t("calendar.missingInformation"),
        description: t("calendar.titleStartEndRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!isEndAfterStart(startDate, endDate)) {
      toast({
        title: t("calendar.invalidDate"),
        description: t("calendar.endBeforeStart"),
        variant: "destructive",
      });
      return;
    }
    if (sessionType === "vendor_visit" && !vendorName.trim()) {
      toast({
        title: t("calendar.missingInformation"),
        description: t("calendar.vendorFieldsRequired"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        type: sessionType,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        vendor:
          sessionType === "vendor_visit"
            ? {
                name: vendorName.trim(),
                service_type: serviceType.trim() || undefined,
              }
            : undefined,
      });
      if (saved) onSaved?.(saved);
      toast({ title: t("calendar.changesSaved") });
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("calendar.editEvent")}</DialogTitle>
          <DialogDescription>{t("calendar.chooseMeetingOrEventThenAddDetailsInvite")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="edit-event-title">{t("dashboard.title")}</Label>
            <Input
              id="edit-event-title"
              value={title}
              onChange={(change) => setTitle(change.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-event-type">{t("schedule.type")}</Label>
            <Select
              value={sessionType}
              onValueChange={(value) => setSessionType(value as SessionType)}
            >
              <SelectTrigger id="edit-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">{t("sections.meeting")}</SelectItem>
                <SelectItem value="event">{t("dashboard.event")}</SelectItem>
                <SelectItem value="vendor_visit">{t("calendar.vendorVisit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sessionType === "vendor_visit" ? (
            <>
              <div>
                <Label htmlFor="edit-vendor-name">{t("calendar.vendorName")}</Label>
                <Input
                  id="edit-vendor-name"
                  value={vendorName}
                  onChange={(change) => setVendorName(change.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-service-type">{t("calendar.serviceType")}</Label>
                <Input
                  id="edit-service-type"
                  value={serviceType}
                  onChange={(change) => setServiceType(change.target.value)}
                />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="edit-event-start">{t("schedule.start")}</Label>
            <Input
              id="edit-event-start"
              type="datetime-local"
              value={start}
              onChange={(change) => setStart(change.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-event-end">{t("schedule.end")}</Label>
            <Input
              id="edit-event-end"
              type="datetime-local"
              value={end}
              onChange={(change) => setEnd(change.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-event-location">{t("schedule.location")}</Label>
            <Input
              id="edit-event-location"
              value={location}
              onChange={(change) => setLocation(change.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-event-description">{t("registration.companyInfo.description")}</Label>
            <Textarea
              id="edit-event-description"
              rows={3}
              value={description}
              onChange={(change) => setDescription(change.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} data-testid="calendar-save-event">
            {saving ? t("calendar.savingChanges") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
