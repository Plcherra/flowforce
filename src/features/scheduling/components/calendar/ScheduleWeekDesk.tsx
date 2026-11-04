import { useTranslation } from "react-i18next";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ScheduleWeekDeskProps {
  summary: string;
  minimizedView: boolean;
  setMinimizedView: (value: boolean) => void;
  showDailyInfo: boolean;
  setShowDailyInfo: (value: boolean) => void;
  showAvailabilityLayer?: boolean;
  setShowAvailabilityLayer?: (value: boolean) => void;
  onToggleTemplates: () => void;
  onOpenWeekTemplates: () => void;
  onCopyPreviousWeek: () => void;
  onAutoScheduleWeek?: () => void;
  autoScheduleDisabled?: boolean;
  onClearWeek: () => void;
  onPublishWeek: (published: boolean) => void;
  onExportWeekCsv: () => void;
  onPrintWeek: () => void;
  onOpenAddShift: () => void;
  onOpenMultiAdd: () => void;
  onOpenImportShifts: () => void;
  onOpenAddUnavailability: () => void;
  onOpenAddTimeOff: () => void;
  readOnly?: boolean;
  onOpenTimeOffPanel?: () => void;
  smartFillOpen?: boolean;
  onToggleSmartFill?: () => void;
}

function DeskSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-muted"
      onClick={() => onCheckedChange(!checked)}
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-background shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

function DeskCommand({
  label,
  onClick,
  disabled = false,
  pressed,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      className="flex w-full items-center rounded-xl px-2 py-2 text-left text-sm hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ScheduleWeekDesk({
  summary,
  minimizedView,
  setMinimizedView,
  showDailyInfo,
  setShowDailyInfo,
  showAvailabilityLayer = true,
  setShowAvailabilityLayer,
  onToggleTemplates,
  onOpenWeekTemplates,
  onCopyPreviousWeek,
  onAutoScheduleWeek,
  autoScheduleDisabled = false,
  onClearWeek,
  onPublishWeek,
  onExportWeekCsv,
  onPrintWeek,
  onOpenAddShift,
  onOpenMultiAdd,
  onOpenImportShifts,
  onOpenAddUnavailability,
  onOpenAddTimeOff,
  readOnly = false,
  onOpenTimeOffPanel,
  smartFillOpen = false,
  onToggleSmartFill,
}: ScheduleWeekDeskProps) {
  const { t } = useTranslation();
  const [deskOpen, setDeskOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    let tries = 0;
    const find = () => {
      const node = document.getElementById("schedule-chrome-slot");
      if (node) {
        setSlot(node);
        return;
      }
      if (tries < 20) {
        tries += 1;
        frame = requestAnimationFrame(find);
      }
    };
    find();
    return () => cancelAnimationFrame(frame);
  }, []);

  const run = (action: () => void) => {
    setDeskOpen(false);
    action();
  };

  const createItem = (label: string, action: () => void) => (
    <button
      key={label}
      type="button"
      className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-primary/10"
      onClick={() => {
        setCreateOpen(false);
        action();
      }}
    >
      {label}
    </button>
  );

  const deskTrigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1 rounded-full px-2.5"
      aria-label={t("schedule.weekDesk")}
      onClick={() => setDeskOpen(true)}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t("schedule.desk")}</span>
    </Button>
  );

  return (
    <>
      {slot ? createPortal(deskTrigger, slot) : null}
      {readOnly && onOpenTimeOffPanel && slot
        ? createPortal(
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full"
              onClick={onOpenTimeOffPanel}
            >
              {t("schedule.requestTimeOff")}
            </Button>,
            slot,
          )
        : null}

      {!readOnly ? (
        <Popover open={createOpen} onOpenChange={setCreateOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("schedule.create")}
              data-testid="add-shift-control"
              className="above-bottom-icon-nav fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg print:hidden"
            >
              <Plus className="h-6 w-6" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-56 p-2"
            data-testid="create-menu"
          >
            {createItem(t("schedule.newShift"), onOpenAddShift)}
            {createItem(t("schedule.severalShifts"), onOpenMultiAdd)}
            {createItem(t("schedule.importSpreadsheet"), onOpenImportShifts)}
            {createItem(t("schedule.markUnavailability"), onOpenAddUnavailability)}
            {createItem(t("schedule.bookTimeOff"), onOpenAddTimeOff)}
          </PopoverContent>
        </Popover>
      ) : null}

      <Sheet open={deskOpen} onOpenChange={setDeskOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[min(78dvh,36rem)] overflow-y-auto rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>{t("schedule.weekDesk")}</SheetTitle>
            <SheetDescription>{summary}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <section aria-label={t("schedule.look")}>
              <h3 className="px-2 text-xs text-muted-foreground">{t("schedule.look")}</h3>
              <DeskSwitch
                label={t("schedule.compactRows")}
                checked={minimizedView}
                onCheckedChange={setMinimizedView}
              />
              <DeskSwitch
                label={t("schedule.dayTotals")}
                checked={showDailyInfo}
                onCheckedChange={setShowDailyInfo}
              />
              {setShowAvailabilityLayer ? (
                <DeskSwitch
                  label={t("schedule.availabilityShading")}
                  checked={showAvailabilityLayer}
                  onCheckedChange={setShowAvailabilityLayer}
                />
              ) : null}
            </section>
            {!readOnly ? (
              <section aria-label={t("schedule.patterns")}>
                <h3 className="px-2 text-xs text-muted-foreground">{t("schedule.patterns")}</h3>
                <DeskCommand label={t("schedule.roleTemplates2")} onClick={() => run(onToggleTemplates)} />
                <DeskCommand
                  label={t("schedule.weekBlueprints")}
                  onClick={() => run(onOpenWeekTemplates)}
                />
                {onToggleSmartFill ? (
                  <DeskCommand
                    label={t("schedule.coverageCoach")}
                    pressed={smartFillOpen}
                    onClick={() => run(onToggleSmartFill)}
                  />
                ) : null}
              </section>
            ) : null}
            {!readOnly ? (
              <section aria-label={t("schedule.thisWeek")} className="sm:col-span-2">
                <h3 className="px-2 text-xs text-muted-foreground">{t("schedule.thisWeek")}</h3>
                <div className="grid sm:grid-cols-2">
                  <DeskCommand
                    label={t("schedule.repeatPreviousWeek")}
                    onClick={() => run(onCopyPreviousWeek)}
                  />
                  {onAutoScheduleWeek ? (
                    <DeskCommand
                      label={t("schedule.autoFillWeek")}
                      disabled={autoScheduleDisabled}
                      onClick={() => run(onAutoScheduleWeek)}
                    />
                  ) : null}
                  <DeskCommand label={t("schedule.emptyThisWeek")} onClick={() => run(onClearWeek)} />
                  <DeskCommand
                    label={t("schedule.publishToTheTeam")}
                    onClick={() => run(() => onPublishWeek(true))}
                  />
                  <DeskCommand
                    label={t("schedule.returnToDraft")}
                    onClick={() => run(() => onPublishWeek(false))}
                  />
                  <DeskCommand label={t("schedule.downloadCsv")} onClick={() => run(onExportWeekCsv)} />
                  <DeskCommand label={t("schedule.printThisWeek")} onClick={() => run(onPrintWeek)} />
                </div>
              </section>
            ) : null}
            {!readOnly ? (
              <div className="flex flex-wrap gap-3 px-2 text-[11px] text-muted-foreground sm:col-span-2">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-success" />
                  {t("schedule.published")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-warning" />
                  {t("schedule.draft")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-destructive" />
                  {t("schedule.understaffed")}
                </span>
              </div>
            ) : null}
            {readOnly && onOpenTimeOffPanel ? (
              <DeskCommand
                label={t("schedule.requestTimeOff")}
                onClick={() => run(onOpenTimeOffPanel)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
