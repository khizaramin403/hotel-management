const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export const TAX_RATE = 0.1;

export interface BookingTotals {
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
}

/** Parses a `YYYY-MM-DD` calendar date string into UTC midnight milliseconds, throwing on invalid dates. */
function parseCalendarDateUtc(dateStr: string): number {
  const match = DATE_REGEX.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const dt = new Date(utcMs);

  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date "${dateStr}".`);
  }

  return utcMs;
}

/** Returns true when `dateStr` is a valid `YYYY-MM-DD` calendar date. */
export function isValidCalendarDate(dateStr: string): boolean {
  try {
    parseCalendarDateUtc(dateStr);
    return true;
  } catch {
    return false;
  }
}

/** Computes the exact whole number of nights between two `YYYY-MM-DD` calendar dates using UTC. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const checkInUtc = parseCalendarDateUtc(checkIn);
  const checkOutUtc = parseCalendarDateUtc(checkOut);
  return (checkOutUtc - checkInUtc) / MS_PER_DAY;
}

/** Calculates subtotal, 10% rounded tax, and total price in whole PKR rupees. */
export function calcTotals(nights: number, pricePerNight: number): BookingTotals {
  if (!Number.isInteger(nights) || nights < 0) {
    throw new RangeError("nights must be a non-negative integer.");
  }
  if (!Number.isInteger(pricePerNight) || pricePerNight < 0) {
    throw new RangeError("pricePerNight must be a non-negative integer.");
  }

  const subtotal = nights * pricePerNight;
  const taxAmount = Math.round(subtotal / 10);
  const totalPrice = subtotal + taxAmount;

  return { subtotal, taxAmount, totalPrice };
}
