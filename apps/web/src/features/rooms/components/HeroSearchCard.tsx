"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExclamationCircleOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { MAX_STAY_NIGHTS, nightsBetween, ROOM_TYPES, type RoomType } from "@hotel/shared";
import { Button, Select, Skeleton } from "antd";
import {
  DateRangePicker,
  formatCalendarDate,
  getTodayCalendarDate,
  parseCalendarDate,
} from "@/lib/datePicker";
import { plural } from "@/lib/format";
import {
  buildHeroSearchUrl,
  MAX_SEARCH_GUESTS,
  MIN_SEARCH_GUESTS,
  parseHeroSearchParams,
  type HeroSearchValues,
} from "../lib/searchParams";

interface RoomTypeOption {
  value: RoomType | "";
  label: string;
}

const ROOM_TYPE_OPTIONS: RoomTypeOption[] = [
  { value: "", label: "All room types" },
  ...ROOM_TYPES.map((type) => ({ value: type, label: type })),
];

function toDateRangeValue(checkIn?: string, checkOut?: string): [Date, Date] | null {
  if (!checkIn || !checkOut) {
    return null;
  }
  const start = parseCalendarDate(checkIn);
  const end = parseCalendarDate(checkOut);
  return start && end ? [start, end] : null;
}

function isPastCalendarDate(current: Date): boolean {
  return formatCalendarDate(current) < getTodayCalendarDate();
}

interface HeroSearchFormProps {
  initialValues: HeroSearchValues;
  currentSearchParams: Pick<URLSearchParams, "entries">;
}

function HeroSearchForm({ initialValues, currentSearchParams }: HeroSearchFormProps) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(() =>
    toDateRangeValue(initialValues.checkIn, initialValues.checkOut),
  );
  const [guests, setGuests] = useState<number>(initialValues.guests);
  const [roomType, setRoomType] = useState<RoomType | undefined>(initialValues.type);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleRangeChange = (dates: [Date | null, Date | null] | null) => {
    setDateRange(dates);
    setDateError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const start = dateRange?.[0] ?? null;
    const end = dateRange?.[1] ?? null;

    if ((start && !end) || (!start && end)) {
      setDateError("Select both check-in and check-out dates.");
      return;
    }

    let checkIn: string | undefined;
    let checkOut: string | undefined;

    if (start && end) {
      checkIn = formatCalendarDate(start);
      checkOut = formatCalendarDate(end);

      if (checkIn < getTodayCalendarDate()) {
        setDateError("Check-in date cannot be in the past.");
        return;
      }

      const nights = nightsBetween(checkIn, checkOut);
      if (nights <= 0) {
        setDateError("Check-out date must be after check-in date.");
        return;
      }

      if (nights > MAX_STAY_NIGHTS) {
        setDateError(`Stay cannot exceed ${MAX_STAY_NIGHTS} nights.`);
        return;
      }
    }

    setDateError(null);
    const targetUrl = buildHeroSearchUrl(
      {
        ...(checkIn && checkOut ? { checkIn, checkOut } : {}),
        guests,
        ...(roomType ? { type: roomType } : {}),
      },
      currentSearchParams,
    );
    router.push(targetUrl);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg border border-line bg-neutral-0 p-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label
            htmlFor="hero-search-dates"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Dates
          </label>
          <DateRangePicker
            id="hero-search-dates"
            size="large"
            className="w-full"
            format="YYYY-MM-DD"
            placeholder={["Check-in", "Check-out"]}
            value={dateRange}
            disabledDate={isPastCalendarDate}
            status={dateError ? "error" : undefined}
            aria-invalid={dateError ? true : undefined}
            aria-describedby={dateError ? "hero-search-dates-error" : undefined}
            onChange={handleRangeChange}
          />
        </div>

        <div>
          <span
            id="hero-search-guests-label"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Guests
          </span>
          <div
            role="group"
            aria-labelledby="hero-search-guests-label"
            className="flex h-12 items-center justify-between rounded-md border border-line-strong bg-neutral-0 px-1 transition-colors duration-[120ms] hover:border-green-300 focus-within:border-green-600 focus-within:shadow-[0_0_0_3px_rgba(31,77,69,0.15)]"
          >
            <Button
              type="text"
              icon={<MinusOutlined aria-hidden="true" />}
              aria-label="Decrease guests"
              disabled={guests <= MIN_SEARCH_GUESTS}
              onClick={() => setGuests((prev) => Math.max(MIN_SEARCH_GUESTS, prev - 1))}
              className="flex h-11 w-11 items-center justify-center"
            />
            <span
              data-testid="guests-stepper-value"
              className="font-sans text-[16px] leading-[22px] tabular text-ink md:text-[14px]"
            >
              {plural(guests, "guest")}
            </span>
            <Button
              type="text"
              icon={<PlusOutlined aria-hidden="true" />}
              aria-label="Increase guests"
              disabled={guests >= MAX_SEARCH_GUESTS}
              onClick={() => setGuests((prev) => Math.min(MAX_SEARCH_GUESTS, prev + 1))}
              className="flex h-11 w-11 items-center justify-center"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="hero-search-room-type"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Room type
          </label>
          <Select<RoomType | "">
            id="hero-search-room-type"
            size="large"
            className="w-full"
            allowClear
            placeholder="All room types"
            value={roomType}
            options={ROOM_TYPE_OPTIONS}
            onChange={(value) => setRoomType(value ? value : undefined)}
          />
        </div>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          className="w-full lg:w-auto lg:min-w-[120px]"
        >
          Search
        </Button>
      </div>

      {dateError ? (
        <div
          id="hero-search-dates-error"
          role="alert"
          className="mt-2 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
        >
          <ExclamationCircleOutlined aria-hidden="true" />
          <span>{dateError}</span>
        </div>
      ) : null}
    </form>
  );
}

export function HeroSearchCard() {
  const searchParams = useSearchParams();
  const initialValues = parseHeroSearchParams(searchParams);

  return (
    <HeroSearchForm
      key={searchParams.toString()}
      initialValues={initialValues}
      currentSearchParams={searchParams}
    />
  );
}

export function HeroSearchCardFallback() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-line bg-neutral-0 p-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Skeleton.Input active block size="large" />
        <Skeleton.Input active block size="large" />
        <Skeleton.Input active block size="large" />
        <Skeleton.Button active size="large" className="!w-full lg:!w-[120px]" />
      </div>
    </div>
  );
}
