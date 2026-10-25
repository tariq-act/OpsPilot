import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";

import type { AnalyticsDateRangeQuery, RevenueTrendPeriod } from "@/lib/types";

export type AnalyticsRangePreset =
  | "all"
  | "today"
  | "week"
  | "month"
  | "last_month"
  | "custom";

export const ANALYTICS_RANGE_PRESET_LABEL: Record<AnalyticsRangePreset, string> =
  {
    all: "All time",
    today: "Today",
    week: "This week",
    month: "This month",
    last_month: "Last month",
    custom: "Custom range",
  };

export const ANALYTICS_RANGE_PRESETS = Object.keys(
  ANALYTICS_RANGE_PRESET_LABEL,
) as AnalyticsRangePreset[];

export const REVENUE_PERIOD_LABEL: Record<RevenueTrendPeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

export const REVENUE_PERIODS = Object.keys(
  REVENUE_PERIOD_LABEL,
) as RevenueTrendPeriod[];

function toIso(date: Date): string {
  return date.toISOString();
}

/** Build API fromDate/toDate from a preset. `all` omits both. */
export function rangeFromPreset(
  preset: AnalyticsRangePreset,
  now = new Date(),
): AnalyticsDateRangeQuery {
  switch (preset) {
    case "all":
      return {};
    case "today":
      return {
        fromDate: toIso(startOfDay(now)),
        toDate: toIso(endOfDay(now)),
      };
    case "week":
      return {
        fromDate: toIso(startOfWeek(now, { weekStartsOn: 1 })),
        toDate: toIso(endOfWeek(now, { weekStartsOn: 1 })),
      };
    case "month":
      return {
        fromDate: toIso(startOfMonth(now)),
        toDate: toIso(endOfMonth(now)),
      };
    case "last_month": {
      const previous = subMonths(now, 1);
      return {
        fromDate: toIso(startOfMonth(previous)),
        toDate: toIso(endOfMonth(previous)),
      };
    }
    case "custom":
      return {};
  }
}

export function suggestPeriodForPreset(
  preset: AnalyticsRangePreset,
): RevenueTrendPeriod {
  if (preset === "today") return "day";
  if (preset === "week") return "day";
  if (preset === "month" || preset === "last_month") return "week";
  return "month";
}

/** Last N days helper for empty custom defaults. */
export function lastDaysRange(days: number, now = new Date()): AnalyticsDateRangeQuery {
  return {
    fromDate: toIso(startOfDay(subDays(now, days - 1))),
    toDate: toIso(endOfDay(now)),
  };
}

export function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}
