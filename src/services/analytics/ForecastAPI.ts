import { parseISO } from "date-fns";

type CoverageTemplateInput = {
  id: string;
  day_of_week: number;
  start_time: string;
  role: string;
  required_count: number;
  forecast_multiplier?: number | null;
  metadata?: Record<string, unknown> | null;
};

export interface CoverageForecast {
  templateId: string;
  scale: number;
  requiredCount: number;
  lowerBound: number;
  upperBound: number;
  isAnomaly: boolean;
}

export interface ForecastWindow {
  start: string;
  end: string;
  timezone?: string;
}

const WEEKEND_BOOST: Record<number, number> = {
  0: 1.12,
  5: 1.08,
  6: 1.15,
};

const TIME_BANDS = [
  { endHour: 10, multiplier: 0.92 },
  { endHour: 15, multiplier: 1.05 },
  { endHour: 19, multiplier: 1.18 },
  { endHour: 23, multiplier: 1.02 },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isIsoTime = (value: string) => /^\d{2}:\d{2}(:\d{2})?$/.test(value);

const extractHour = (isoTime: string) => {
  if (!isIsoTime(isoTime)) {
    try {
      return new Date(isoTime).getUTCHours();
    } catch {
      return 0;
    }
  }
  return Number.parseInt(isoTime.slice(0, 2), 10);
};

export class ForecastAPI {
  getCoverageForecast(
    templates: CoverageTemplateInput[],
    options: {
      window: ForecastWindow;
      location?: string;
    },
  ): CoverageForecast[] {
    const endReference = safeParseDate(options.window.end);
    const confidenceDecay = this.getConfidenceDecay(endReference);
    const results: CoverageForecast[] = [];

    for (const template of templates) {
      const weekendMultiplier = getWeekendMultiplier(template.day_of_week);
      const bandMultiplier =
        TIME_BANDS.find(
          (band) => extractHour(template.start_time) <= band.endHour,
        )?.multiplier ?? 1;

      const previousMultiplier = safeNumber(template.forecast_multiplier, 1);
      const metadataMultiplier = getMetadataMultiplier(template.metadata);

      const scale = clamp(
        previousMultiplier *
          weekendMultiplier *
          bandMultiplier *
          metadataMultiplier *
          confidenceDecay,
        0.6,
        1.8,
      );

      const required = Math.max(0, Math.round(template.required_count * scale));
      const delta = Math.abs(scale - previousMultiplier);

      results.push({
        templateId: template.id,
        scale,
        requiredCount: required,
        lowerBound: clamp(scale - 0.18, 0.4, 1.6),
        upperBound: clamp(scale + 0.18, 0.4, 1.9),
        isAnomaly: delta > 0.3,
      });
    }

    return results;
  }

  private getConfidenceDecay(referenceDate: Date | null): number {
    if (!referenceDate) return 1;
    const now = new Date();
    const diffDays = Math.max(
      0,
      (referenceDate.getTime() - now.getTime()) / 86400000,
    );
    if (diffDays <= 7) return 1.05;
    if (diffDays <= 14) return 1.0;
    if (diffDays <= 21) return 0.95;
    return 0.9;
  }
}

function safeParseDate(value: string | undefined): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

function safeNumber(value: number | null | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function getWeekendMultiplier(day: number) {
  return WEEKEND_BOOST[day] ?? 1;
}

function getMetadataMultiplier(
  metadata: Record<string, unknown> | null | undefined,
): number {
  if (!metadata) return 1;
  const demand = (metadata as { demand_signal?: number | string } | undefined)
    ?.demand_signal;
  if (typeof demand === "number") {
    return clamp(1 + demand / 100, 0.8, 1.4);
  }
  if (typeof demand === "string") {
    const normalized = demand.toLowerCase();
    if (normalized.includes("high")) return 1.2;
    if (normalized.includes("low")) return 0.85;
  }
  return 1;
}

export default ForecastAPI;
