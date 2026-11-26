import { formatCalendarDate, getTodayCalendarDate, parseCalendarDate } from "@/lib/datePicker";

const integerFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
});

export interface DashboardDateRange {
  from: string;
  to: string;
  today: string;
}

/** Returns the inclusive last-30-days calendar window [today - 29 days, today] in YYYY-MM-DD. */
export function getLast30DaysRange(now: Date = new Date()): DashboardDateRange {
  const today = getTodayCalendarDate(now);
  const todayDate = parseCalendarDate(today) ?? now;
  const fromDate = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate() - 29,
  );

  return {
    from: formatCalendarDate(fromDate),
    to: today,
    today,
  };
}

/** Formats an integer stat counter using en-GB grouping (e.g. 1,234). */
export function formatStatCount(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError("Stat count must be a finite number.");
  }
  return integerFormatter.format(Math.round(value));
}

/** Formats an occupancy percentage with up to 1 decimal place (e.g. 78% or 13.9%). */
export function formatOccupancyRate(rate: number): string {
  if (!Number.isFinite(rate)) {
    throw new RangeError("Occupancy rate must be a finite number.");
  }
  const rounded = Math.round(rate * 10) / 10;
  return `${percentageFormatter.format(rounded)}%`;
}
