import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { type AppEvent, type EventAttendee } from "@/hooks/useEvents";
import { useScheduling } from "@/contexts/SchedulingContext";
import { Schedule } from "@/types/common";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useCreateVendorVisit } from "@/features/calendar/hooks/useCreateVendorVisit";
import {
  defaultEventWindow,
  fromDatetimeLocalValue,
  isEndAfterStart,
} from "@/features/calendar/utils/calendarBoard";
import { useTranslation } from "react-i18next";

interface CreateVendorVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (event: AppEvent) => void;
}

export function CreateVendorVisitDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateVendorVisitDialogProps) {
  const { t } = useTranslation();
  const { shifts } = useScheduling();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { createVendorVisit } = useCreateVendorVisit();

  const [title, setTitle] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [selectedShiftIds, setSelectedShiftIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (open) {
      const window = defaultEventWindow();
      setTitle("");
      setVendorName("");
      setServiceType("");
      setLocation("");
      setDescription("");
      setStart(window.start);
      setEnd(window.end);
      setSelectedShiftIds({});
    }
  }, [open]);

  const suggestions = useMemo(() => {
    if (!start || !end) return [] as Schedule[];
    const s = new Date(start);
    const e = new Date(end);
    const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
      return aStart <= bEnd && bStart <= aEnd;
    };
    return (shifts || [])
      .filter((sh) => {
        const shS = new Date(sh.start_time);
        const shE = new Date(sh.end_time);
        const timeOk = overlaps(s, e, shS, shE);
        const locOk =
          !location ||
          (sh.location || "").toLowerCase().includes(location.toLowerCase());
        return timeOk && locOk;
      })
      .slice(0, 20);
  }, [shifts, start, end, location]);

  const toggleShift = (id: string, next: boolean | string) => {
    const v = Boolean(next);
    setSelectedShiftIds((prev) => ({ ...prev, [id]: v }));
  };

  const buildAttendees = (shiftIds: string[]): EventAttendee[] => {
    if (!shiftIds.length) return [];
    const map = new Map<string, EventAttendee>();
    shifts
      .filter((shift) => shiftIds.includes(shift.id))
      .forEach((shift) => {
        shift.assignments?.forEach((assignment) => {
          if (assignment.user?.id) {
            const name =
              `${assignment.user.first_name ?? ""} ${assignment.user.last_name ?? ""}`.trim() ||
              t("calendar.teamMember");
            map.set(assignment.user.id, {
              id: assignment.user.id,
              name,
              avatar_url: assignment.user.avatar_url ?? null,
              role:
                shift.job_position?.name ?? assignment.user.role ?? undefined,
            });
          }
        });
      });
    return Array.from(map.values());
  };

  const handleCreate = async () => {
    const startIso = fromDatetimeLocalValue(start);
    const endIso = fromDatetimeLocalValue(end);
    if (!startIso || !endIso || !title.trim() || !vendorName.trim()) {
      toast({
        title: t("calendar.missingInformation"),
        description: t("calendar.vendorFieldsRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!isEndAfterStart(startIso, endIso)) {
      toast({
        title: t("calendar.invalidDate"),
        description: t("calendar.endBeforeStart"),
        variant: "destructive",
      });
      return;
    }

    const companyId = profile?.companyId ?? profile?.company_id ?? null;
    if (!companyId) {
      toast({
        title: t("calendar.missingCompany"),
        description: t("calendar.needCompanyForVendor"),
        variant: "destructive",
      });
      return;
    }

    const linkedShiftIds = Object.entries(selectedShiftIds)
      .filter(([, v]) => v)
      .map(([id]) => id);

    try {
      const visit = await createVendorVisit({
        title: title.trim(),
        description: description || undefined,
        location: location || undefined,
        start: startIso.toISOString(),
        end: endIso.toISOString(),
        related_shift_ids: linkedShiftIds,
        attendees: buildAttendees(linkedShiftIds),
        vendor: { name: vendorName.trim(), service_type: serviceType || undefined },
      });

      if (visit.id) {
        onCreated?.(visit);
      }

      toast({
        title: t("calendar.vendorVisitCreated"),
        description: `${vendorName.trim()} · ${startIso.toLocaleString()}`,
      });
      onOpenChange(false);
    } catch {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("calendar.createVendorVisit")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor-title">{t("dashboard.title")}</Label>
            <Input id="vendor-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vendor-name">{t("calendar.vendorName")}</Label>
            <Input
              id="vendor-name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder={t("calendar.eGAcmeElectric")}
            />
          </div>
          <div>
            <Label htmlFor="vendor-service">{t("calendar.serviceType")}</Label>
            <Input
              id="vendor-service"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder={t("calendar.electricalHvacEtc")}
            />
          </div>
          <div>
            <Label htmlFor="vendor-location">{t("schedule.location")}</Label>
            <Input
              id="vendor-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("calendar.siteArea")}
            />
          </div>
          <div>
            <Label htmlFor="vendor-start">{t("schedule.start")}</Label>
            <Input
              id="vendor-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vendor-end">{t("schedule.end")}</Label>
            <Input
              id="vendor-end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="vendor-description">{t("registration.companyInfo.description")}</Label>
            <Textarea
              id="vendor-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">{t("calendar.suggestedShiftsTimeLocationOverlap")}</div>
          <div className="max-h-48 overflow-auto border rounded-md p-2 space-y-2">
            {suggestions.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-4">{t("calendar.noMatchingShiftsAdjustTimeOrLocationTo")}</div>
            )}
            {suggestions.map((sh) => (
              <label key={sh.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!selectedShiftIds[sh.id]}
                  onCheckedChange={(v) => toggleShift(sh.id, v)}
                />
                <span className="truncate">
                  {sh.title || sh.job_position?.name || t("calendar.shiftFallback")} –{" "}
                  {new Date(sh.start_time).toLocaleTimeString()} to{" "}
                  {new Date(sh.end_time).toLocaleTimeString()}{" "}
                  {sh.location ? `• ${sh.location}` : ""}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button
            onClick={handleCreate}
            disabled={!vendorName || !title || !start || !end}
          >{t("calendar.createVisit")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
