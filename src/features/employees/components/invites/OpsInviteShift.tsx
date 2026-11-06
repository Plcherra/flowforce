import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { opsFirstShiftRange, type OpsFirstShift } from "../../utils/opsInviteFlow";

export function OpsInviteShift({
  canAddShift,
  isSubmitting,
  onBack,
  onSend,
}: {
  canAddShift: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onSend: (shift: OpsFirstShift | null) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const sendShift = () => {
    const shift = opsFirstShiftRange({ date, start, end });
    if (!shift) {
      toast({
        variant: "destructive",
        title: t("employees.opsFlowShift"),
        description: t("employees.opsFlowShiftInvalid"),
      });
      return;
    }
    onSend(shift);
  };

  return (
    <div className="space-y-4" data-testid="ops-shift">
      <div>
        <h3 className="text-lg font-semibold">{t("employees.opsFlowShift")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {canAddShift
            ? t("employees.opsFlowShiftHelp")
            : t("employees.opsFlowShiftForbidden")}
        </p>
      </div>

      {canAddShift ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="ops-shift-date">{t("employees.opsFlowDate")}</Label>
            <Input
              id="ops-shift-date"
              data-testid="ops-shift-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ops-shift-start">{t("employees.opsFlowStart")}</Label>
            <Input
              id="ops-shift-start"
              data-testid="ops-shift-start"
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ops-shift-end">{t("employees.opsFlowEnd")}</Label>
            <Input
              id="ops-shift-end"
              data-testid="ops-shift-end"
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          {t("employees.opsFlowBack")}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="ops-shift-skip"
            onClick={() => onSend(null)}
            disabled={isSubmitting}
          >
            {t("employees.opsFlowSend")}
          </Button>
          {canAddShift ? (
            <Button
              type="button"
              data-testid="ops-shift-save"
              onClick={sendShift}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("literals.sending") : t("employees.opsFlowAddShift")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
