"use client";

import { DatePicker } from "antd";

type DateGenerateConfig = Parameters<typeof DatePicker.generatePicker<Date>>[0];

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const SHORT_WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

/** Parses a YYYY-MM-DD (or YYYY-M-D) calendar date string into a local Date. */
export function parseCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Formats a local Date instance into a YYYY-MM-DD calendar date string. */
export function formatCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Returns today's local calendar date as YYYY-MM-DD. */
export function getTodayCalendarDate(now: Date = new Date()): string {
  return formatCalendarDate(now);
}

function formatDateTokens(date: Date, pattern: string): string {
  return pattern.replace(/YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|H|mm|m|ss|s/g, (token) => {
    switch (token) {
      case "YYYY":
        return String(date.getFullYear()).padStart(4, "0");
      case "YY":
        return String(date.getFullYear()).slice(-2);
      case "MMMM":
        return FULL_MONTHS[date.getMonth()] ?? "";
      case "MMM":
        return SHORT_MONTHS[date.getMonth()] ?? "";
      case "MM":
        return pad2(date.getMonth() + 1);
      case "M":
        return String(date.getMonth() + 1);
      case "DD":
        return pad2(date.getDate());
      case "D":
        return String(date.getDate());
      case "HH":
        return pad2(date.getHours());
      case "H":
        return String(date.getHours());
      case "mm":
        return pad2(date.getMinutes());
      case "m":
        return String(date.getMinutes());
      case "ss":
        return pad2(date.getSeconds());
      case "s":
        return String(date.getSeconds());
      default:
        return token;
    }
  });
}

function parseWithPattern(text: string, format: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (format === "YYYY-MM-DD" || format === "YYYY-M-D") {
    const strictPattern =
      format === "YYYY-MM-DD" ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{1,2}-\d{1,2}$/;
    if (!strictPattern.test(trimmed)) {
      return null;
    }
    return parseCalendarDate(trimmed);
  }

  if (format === "YYYY/MM/DD") {
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
      return null;
    }
    return parseCalendarDate(trimmed.replace(/\//g, "-"));
  }

  return null;
}

const nativeDateGenerateConfig: DateGenerateConfig = {
  getNow: () => new Date(),
  getFixedDate: (fixed) => parseCalendarDate(fixed) ?? new Date(Number.NaN),
  getEndDate: (date) =>
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  getWeekDay: (date) => date.getDay(),
  getYear: (date) => date.getFullYear(),
  getMonth: (date) => date.getMonth(),
  getDate: (date) => date.getDate(),
  getHour: (date) => date.getHours(),
  getMinute: (date) => date.getMinutes(),
  getSecond: (date) => date.getSeconds(),
  getMillisecond: (date) => date.getMilliseconds(),
  addYear: (date, diff) => {
    const next = cloneDate(date);
    const targetYear = next.getFullYear() + diff;
    const targetMonth = next.getMonth();
    const clampedDay = Math.min(next.getDate(), daysInMonth(targetYear, targetMonth));
    next.setFullYear(targetYear, targetMonth, clampedDay);
    return next;
  },
  addMonth: (date, diff) => {
    const next = cloneDate(date);
    const totalMonths = next.getFullYear() * 12 + next.getMonth() + diff;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const clampedDay = Math.min(next.getDate(), daysInMonth(targetYear, targetMonth));
    next.setFullYear(targetYear, targetMonth, clampedDay);
    return next;
  },
  addDate: (date, diff) => {
    const next = cloneDate(date);
    next.setDate(next.getDate() + diff);
    return next;
  },
  setYear: (date, year) => {
    const next = cloneDate(date);
    const clampedDay = Math.min(next.getDate(), daysInMonth(year, next.getMonth()));
    next.setFullYear(year, next.getMonth(), clampedDay);
    return next;
  },
  setMonth: (date, month) => {
    const next = cloneDate(date);
    const clampedDay = Math.min(next.getDate(), daysInMonth(next.getFullYear(), month));
    next.setMonth(month, clampedDay);
    return next;
  },
  setDate: (date, day) => {
    const next = cloneDate(date);
    next.setDate(day);
    return next;
  },
  setHour: (date, hour) => {
    const next = cloneDate(date);
    next.setHours(hour);
    return next;
  },
  setMinute: (date, minute) => {
    const next = cloneDate(date);
    next.setMinutes(minute);
    return next;
  },
  setSecond: (date, second) => {
    const next = cloneDate(date);
    next.setSeconds(second);
    return next;
  },
  setMillisecond: (date, millisecond) => {
    const next = cloneDate(date);
    next.setMilliseconds(millisecond);
    return next;
  },
  isAfter: (date1, date2) => date1.getTime() > date2.getTime(),
  isValidate: (date) => date instanceof Date && !Number.isNaN(date.getTime()),
  locale: {
    getWeekFirstDay: () => 0,
    getWeekFirstDate: (_locale, date) => {
      const next = cloneDate(date);
      next.setDate(next.getDate() - next.getDay());
      return next;
    },
    getWeek: (_locale, date) => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const dayOfYear =
        Math.floor(
          (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
            Date.UTC(date.getFullYear(), 0, 1)) /
            86_400_000,
        ) + 1;
      return Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
    },
    getShortWeekDays: () => SHORT_WEEK_DAYS,
    getShortMonths: () => SHORT_MONTHS,
    format: (_locale, date, format) => formatDateTokens(date, format),
    parse: (_locale, text, formats) => {
      for (const format of formats) {
        const parsed = parseWithPattern(text, format);
        if (parsed) {
          return parsed;
        }
      }
      return null;
    },
  },
};

export const AppDatePicker = DatePicker.generatePicker<Date>(nativeDateGenerateConfig);
export const DateRangePicker = AppDatePicker.RangePicker;
