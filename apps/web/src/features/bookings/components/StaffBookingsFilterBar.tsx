"use client";

import { useEffect, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { BOOKING_STATUSES, type BookingStatus } from "@hotel/shared";
import { Input } from "antd";
import { BOOKING_STATUS_TAG_MAP, Chip } from "@/components/ui";
import { DateRangePicker, formatCalendarDate, parseCalendarDate } from "@/lib/datePicker";

export const SEARCH_DEBOUNCE_MS = 300;

export interface StaffBookingsFilterBarProps {
  selectedStatuses: readonly BookingStatus[];
  from?: string;
  to?: string;
  searchQuery?: string;
  onSelectStatus: (status?: BookingStatus) => void;
  onDateRangeChange: (from?: string, to?: string) => void;
  onSearchChange: (q?: string) => void;
}

function toPickerValue(from?: string, to?: string): [Date, Date] | null {
  if (!from || !to) {
    return null;
  }
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  return start && end ? [start, end] : null;
}

export function StaffBookingsFilterBar({
  selectedStatuses,
  from,
  to,
  searchQuery = "",
  onSelectStatus,
  onDateRangeChange,
  onSearchChange,
}: StaffBookingsFilterBarProps) {
  const [searchText, setSearchText] = useState(searchQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(searchQuery);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState(searchQuery);

  if (searchQuery !== prevUrlQuery) {
    setPrevUrlQuery(searchQuery);
    if (searchQuery !== lastSubmittedQuery) {
      setLastSubmittedQuery(searchQuery);
      setSearchText(searchQuery);
    }
  }

  const onSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === lastSubmittedQuery.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLastSubmittedQuery(trimmed);
      onSearchChangeRef.current(trimmed.length > 0 ? trimmed : undefined);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [lastSubmittedQuery, searchText]);

  const pickerValue = toPickerValue(from, to);

  const handleRangeChange = (dates: [Date | null, Date | null] | null) => {
    const start = dates?.[0] ?? null;
    const end = dates?.[1] ?? null;
    if (!start || !end) {
      onDateRangeChange(undefined, undefined);
      return;
    }
    onDateRangeChange(formatCalendarDate(start), formatCalendarDate(end));
  };

  return (
    <div className="space-y-3 rounded-lg border border-line bg-neutral-0 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="w-full md:w-[280px]">
          <label
            htmlFor="staff-bookings-search"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Search
          </label>
          <Input
            id="staff-bookings-search"
            allowClear
            placeholder="Reference or guest name"
            prefix={<SearchOutlined className="text-muted" aria-hidden="true" />}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={() => {
              const trimmed = searchText.trim();
              if (trimmed !== lastSubmittedQuery.trim()) {
                setLastSubmittedQuery(trimmed);
                onSearchChange(trimmed.length > 0 ? trimmed : undefined);
              }
            }}
          />
        </div>

        <div className="w-full md:w-[280px]">
          <label
            htmlFor="staff-bookings-dates"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Check-in dates
          </label>
          <DateRangePicker
            id="staff-bookings-dates"
            className="w-full"
            format="YYYY-MM-DD"
            allowClear
            placeholder={["From date", "To date"]}
            value={pickerValue}
            onChange={handleRangeChange}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Booking status filters"
        className="flex flex-wrap items-center gap-2"
      >
        <Chip
          label="All"
          selected={selectedStatuses.length === 0}
          onToggle={() => onSelectStatus(undefined)}
        />
        {BOOKING_STATUSES.map((status) => (
          <Chip
            key={status}
            label={BOOKING_STATUS_TAG_MAP[status].label}
            selected={selectedStatuses.includes(status)}
            onToggle={(nextSelected) => onSelectStatus(nextSelected ? status : undefined)}
          />
        ))}
      </div>
    </div>
  );
}
