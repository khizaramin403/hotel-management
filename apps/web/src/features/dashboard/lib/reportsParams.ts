import { isValidCalendarDate, reportQuerySchema, type ReportQuery } from "@hotel/shared";
import { formatCalendarDate, getTodayCalendarDate, parseCalendarDate } from "@/lib/datePicker";
import { getLast30DaysRange } from "./dashboardFormat";

export const REPORT_PRESET_KEYS = ["last_7_days", "last_30_days", "this_month"] as const;

export type ReportPresetKey = (typeof REPORT_PRESET_KEYS)[number];

export interface ReportDatePreset {
  key: ReportPresetKey;
  label: string;
  from: string;
  to: string;
}

export interface ParsedReportsParams extends ReportQuery {
  activePreset: ReportPresetKey | null;
}

const DEFAULT_REPORTS_PATH = "/dashboard/reports";

/** Returns the inclusive last-7-days calendar window [today - 6 days, today] in YYYY-MM-DD. */
export function getLast7DaysRange(now: Date = new Date()): ReportQuery {
  const today = getTodayCalendarDate(now);
  const todayDate = parseCalendarDate(today) ?? now;
  const fromDate = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate() - 6,
  );

  return {
    from: formatCalendarDate(fromDate),
    to: today,
  };
}

/** Returns the inclusive month-to-date calendar window [first day of month, today] in YYYY-MM-DD. */
export function getThisMonthRange(now: Date = new Date()): ReportQuery {
  const today = getTodayCalendarDate(now);
  const todayDate = parseCalendarDate(today) ?? now;
  const fromDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

  return {
    from: formatCalendarDate(fromDate),
    to: today,
  };
}

/** Returns the default reports range (last 30 days inclusive ending today). */
export function getDefaultReportsRange(now: Date = new Date()): ReportQuery {
  const { from, to } = getLast30DaysRange(now);
  return { from, to };
}

/** Returns the ordered preset definitions for the Reports RangePicker. */
export function getReportPresets(now: Date = new Date()): ReportDatePreset[] {
  const last7 = getLast7DaysRange(now);
  const last30 = getDefaultReportsRange(now);
  const thisMonth = getThisMonthRange(now);

  return [
    { key: "last_7_days", label: "Last 7 days", from: last7.from, to: last7.to },
    { key: "last_30_days", label: "Last 30 days", from: last30.from, to: last30.to },
    { key: "this_month", label: "This month", from: thisMonth.from, to: thisMonth.to },
  ];
}

/** Matches a date range against the known report presets, or returns null for a custom range. */
export function matchReportPreset(
  range: ReportQuery,
  now: Date = new Date(),
): ReportPresetKey | null {
  const match = getReportPresets(now).find(
    (preset) => preset.from === range.from && preset.to === range.to,
  );
  return match?.key ?? null;
}

/** Parses and validates ?from=&to= URL search params, falling back to the last 30 days. */
export function parseReportsSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
  now: Date = new Date(),
): ParsedReportsParams {
  const rawFrom = searchParams.get("from")?.trim();
  const rawTo = searchParams.get("to")?.trim();

  if (rawFrom && rawTo && isValidCalendarDate(rawFrom) && isValidCalendarDate(rawTo)) {
    const parsed = reportQuerySchema.safeParse({ from: rawFrom, to: rawTo });
    if (parsed.success) {
      return {
        from: parsed.data.from,
        to: parsed.data.to,
        activePreset: matchReportPreset(parsed.data, now),
      };
    }
  }

  const fallback = getDefaultReportsRange(now);
  return {
    from: fallback.from,
    to: fallback.to,
    activePreset: matchReportPreset(fallback, now),
  };
}

/** Builds an updated /dashboard/reports URL storing from and to query parameters. */
export function buildUpdatedReportsUrl(
  currentSearchParams: Pick<URLSearchParams, "toString">,
  range: ReportQuery,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString());
  nextParams.set("from", range.from);
  nextParams.set("to", range.to);
  return `${DEFAULT_REPORTS_PATH}?${nextParams.toString()}`;
}
