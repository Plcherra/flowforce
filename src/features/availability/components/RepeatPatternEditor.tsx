import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REPEAT_CHOICES,
  customPattern,
  nextThreeDates,
  patternFromChoice,
  type RepeatChoice,
  type RepeatUnit,
} from "@/features/scheduling/utils/repeatPattern";

const CHOICE_KEYS: Record<RepeatChoice, string> = {
  none: "schedule.repeatChoiceDoesNot",
  daily: "schedule.repeatChoiceDaily",
  weekly: "schedule.repeatChoiceWeekly",
  monthly: "schedule.repeatChoiceMonthly",
  "every-2-weeks": "schedule.repeatChoiceEvery2Weeks",
  "every-15-days": "schedule.repeatChoiceEvery15Days",
  custom: "schedule.repeatChoiceCustom",
};

export function repeatChoiceKey(choice: RepeatChoice): string {
  return CHOICE_KEYS[choice];
}

export type RepeatEditorValue = {
  choice: RepeatChoice;
  interval: string;
  unit: RepeatUnit;
  anchor: string;
};

type RepeatPatternEditorProps = {
  value: RepeatEditorValue;
  onChange: (value: RepeatEditorValue) => void;
  disabled?: boolean;
};

export function RepeatPatternEditor({
  value,
  onChange,
  disabled,
}: RepeatPatternEditorProps) {
  const { t } = useTranslation();
  const interval = Math.floor(Number(value.interval));
  const pattern =
    value.choice === "custom"
      ? customPattern({
          interval: Number.isFinite(interval) ? interval : 0,
          unit: value.unit,
          anchor: value.anchor,
        })
      : patternFromChoice(value.choice, value.anchor);
  const dates = nextThreeDates(pattern, pattern?.anchor || value.anchor);

  return (
    <div className="grid gap-2">
      <Label>{t("schedule.repeats")}</Label>
      <Select
        value={value.choice}
        onValueChange={(next) =>
          onChange({ ...value, choice: next as RepeatChoice })
        }
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-56" data-testid="availability-repeat-choice">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REPEAT_CHOICES.map((choice) => (
            <SelectItem key={choice.id} value={choice.id}>
              {t(CHOICE_KEYS[choice.id])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.choice === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("schedule.repeatEveryN")}
          </Label>
          <Input
            type="number"
            min={1}
            className="h-8 w-20"
            value={value.interval}
            disabled={disabled}
            data-testid="availability-repeat-interval"
            onChange={(event) =>
              onChange({ ...value, interval: event.target.value })
            }
          />
          <Select
            value={value.unit}
            onValueChange={(next) =>
              onChange({ ...value, unit: next as RepeatUnit })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-28" data-testid="availability-repeat-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">{t("schedule.repeatDays")}</SelectItem>
              <SelectItem value="weeks">{t("schedule.repeatWeeks")}</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-xs text-muted-foreground">
            {t("schedule.repeatStartDate")}
          </Label>
          <Input
            type="date"
            className="h-8 w-40"
            value={value.anchor}
            disabled={disabled}
            data-testid="availability-repeat-start"
            onChange={(event) =>
              onChange({ ...value, anchor: event.target.value })
            }
          />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground" data-testid="availability-repeat-preview">
        {dates.join(", ")}
      </p>
    </div>
  );
}
