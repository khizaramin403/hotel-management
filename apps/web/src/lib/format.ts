const LOCALE = "en-GB";
const CALENDAR_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const integerFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

const dateFormatterWithYear = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateFormatterNoYear = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const pluralRules = new Intl.PluralRules(LOCALE);

function parseDateInput(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new RangeError("Invalid Date instance.");
    }
    return value;
  }

  const calendarMatch = CALENDAR_DATE_REGEX.exec(value);
  if (calendarMatch) {
    const year = Number(calendarMatch[1]);
    const month = Number(calendarMatch[2]);
    const day = Number(calendarMatch[3]);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    if (
      utcDate.getUTCFullYear() !== year ||
      utcDate.getUTCMonth() !== month - 1 ||
      utcDate.getUTCDate() !== day
    ) {
      throw new RangeError(`Invalid calendar date "${value}".`);
    }
    return utcDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid date string "${value}".`);
  }
  return parsed;
}

export interface FormatPriceOptions {
  includeCurrency?: boolean;
}

/** Formats whole-rupee PKR amounts with en-GB thousands separators (e.g., "PKR 15,000"). */
export function formatPrice(amount: number, options: FormatPriceOptions = {}): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError("Price amount must be a finite number.");
  }

  const { includeCurrency = true } = options;
  const rounded = Math.round(amount);
  const formattedNumber = integerFormatter.format(Math.abs(rounded));
  const prefix = rounded < 0 ? "-" : "";

  if (!includeCurrency) {
    return `${prefix}${formattedNumber}`;
  }
  return `${prefix}PKR ${formattedNumber}`;
}

export interface FormatDateOptions {
  includeYear?: boolean;
}

/** Formats a YYYY-MM-DD calendar date or UTC ISO timestamp using en-GB in UTC. */
export function formatDate(value: string | Date, options: FormatDateOptions = {}): string {
  const { includeYear = true } = options;
  const date = parseDateInput(value);
  const formatter = includeYear ? dateFormatterWithYear : dateFormatterNoYear;
  return formatter.format(date);
}

/** Formats a check-in / check-out date range using en-GB Intl range formatting in UTC. */
export function formatDateRange(
  checkIn: string | Date,
  checkOut: string | Date,
  options: FormatDateOptions = {},
): string {
  const { includeYear = true } = options;
  const start = parseDateInput(checkIn);
  const end = parseDateInput(checkOut);
  const formatter = includeYear ? dateFormatterWithYear : dateFormatterNoYear;
  return formatter.formatRange(start, end);
}

/** Formats a booking ID as the user-facing reference (e.g., "BK-1041"). */
export function bookingReference(id: number | string): string {
  return `BK-${id}`;
}

/** Formats a count with its singular or plural noun using en-GB Intl.PluralRules. */
export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = pluralRules.select(count) === "one" ? singular : (pluralForm ?? `${singular}s`);
  return `${integerFormatter.format(count)} ${word}`;
}
