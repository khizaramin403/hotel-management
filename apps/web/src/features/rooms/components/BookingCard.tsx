"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import {
  isValidCalendarDate,
  MAX_STAY_NIGHTS,
  nightsBetween,
  type AvailabilityQuery,
  type RoomDetail,
} from "@hotel/shared";
import { Button, Drawer, Tag, Tooltip } from "antd";
import { ErrorState, Price } from "@/components/ui";
import {
  DateRangePicker,
  formatCalendarDate,
  getTodayCalendarDate,
  parseCalendarDate,
} from "@/lib/datePicker";
import { formatPrice, plural } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/slices/authSlice";
import {
  setBookingDates,
  setBookingGuests,
  setBookingRoom,
  setBookingStep,
} from "@/store/slices/bookingDraftSlice";
import { useRoomAvailabilityQuery } from "../hooks/useRoomAvailabilityQuery";

export interface BookingCardProps {
  room: Pick<RoomDetail, "id" | "pricePerNight" | "capacity">;
}

const AVAILABILITY_DEBOUNCE_MS = 300;

interface InitialBookingUrlParams {
  dates: AvailabilityQuery | null;
  guests: number;
}

function parseInitialBookingUrlParams(
  searchParams: Pick<URLSearchParams, "get">,
  maxCapacity: number,
): InitialBookingUrlParams {
  const today = getTodayCalendarDate();
  const rawCheckIn = searchParams.get("checkIn");
  const rawCheckOut = searchParams.get("checkOut");

  let dates: AvailabilityQuery | null = null;
  if (rawCheckIn && rawCheckOut && isValidCalendarDate(rawCheckIn) && isValidCalendarDate(rawCheckOut)) {
    const nights = nightsBetween(rawCheckIn, rawCheckOut);
    if (rawCheckIn >= today && nights > 0 && nights <= MAX_STAY_NIGHTS) {
      dates = { checkIn: rawCheckIn, checkOut: rawCheckOut };
    }
  }

  const rawGuests = searchParams.get("guests");
  let guests = 1;
  if (rawGuests !== null && /^\d+$/.test(rawGuests.trim())) {
    const parsed = Number(rawGuests.trim());
    if (parsed >= 1) {
      guests = Math.min(maxCapacity, parsed);
    }
  }

  return { dates, guests };
}

function toPickerValue(dates: AvailabilityQuery | null): [Date, Date] | null {
  if (!dates) {
    return null;
  }
  const start = parseCalendarDate(dates.checkIn);
  const end = parseCalendarDate(dates.checkOut);
  return start && end ? [start, end] : null;
}

function isPastCalendarDate(current: Date): boolean {
  return formatCalendarDate(current) < getTodayCalendarDate();
}

function validatePickerRange(
  range: [Date | null, Date | null] | null,
): { dates: AvailabilityQuery | null; error: string | null } {
  const start = range?.[0] ?? null;
  const end = range?.[1] ?? null;

  if (!start && !end) {
    return { dates: null, error: null };
  }
  if (!start || !end) {
    return { dates: null, error: "Select both check-in and check-out dates." };
  }

  const checkIn = formatCalendarDate(start);
  const checkOut = formatCalendarDate(end);

  if (checkIn < getTodayCalendarDate()) {
    return { dates: null, error: "Check-in date cannot be in the past." };
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    return { dates: null, error: "Check-out date must be after check-in date." };
  }
  if (nights > MAX_STAY_NIGHTS) {
    return { dates: null, error: `Stay cannot exceed ${MAX_STAY_NIGHTS} nights.` };
  }

  return { dates: { checkIn, checkOut }, error: null };
}

interface BookingCardFormBodyProps {
  room: Pick<RoomDetail, "id" | "pricePerNight" | "capacity">;
  initialParams: InitialBookingUrlParams;
  searchParamsKey: string;
}

function BookingCardContent({
  room,
  initialParams,
}: Omit<BookingCardFormBodyProps, "searchParamsKey">) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null] | null>(() =>
    toPickerValue(initialParams.dates),
  );
  const [guests, setGuests] = useState<number>(initialParams.guests);
  const [debouncedDates, setDebouncedDates] = useState<AvailabilityQuery | null>(
    () => initialParams.dates,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { dates: validPendingDates, error: rangeError } = validatePickerRange(dateRange);

  useEffect(() => {
    const nextCheckIn = validPendingDates?.checkIn ?? null;
    const nextCheckOut = validPendingDates?.checkOut ?? null;
    if (
      (debouncedDates?.checkIn ?? null) === nextCheckIn &&
      (debouncedDates?.checkOut ?? null) === nextCheckOut
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedDates(validPendingDates);
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [debouncedDates?.checkIn, debouncedDates?.checkOut, validPendingDates]);

  const activeQueryDates =
    validPendingDates &&
    debouncedDates &&
    validPendingDates.checkIn === debouncedDates.checkIn &&
    validPendingDates.checkOut === debouncedDates.checkOut
      ? debouncedDates
      : null;

  const isDebouncing = validPendingDates !== null && activeQueryDates === null;
  const {
    data: availability,
    isPending: isAvailabilityPending,
    isFetching: isAvailabilityFetching,
    isError: isAvailabilityError,
    refetch: refetchAvailability,
  } = useRoomAvailabilityQuery(room.id, activeQueryDates);

  const isChecking =
    isDebouncing || (activeQueryDates !== null && (isAvailabilityPending || isAvailabilityFetching));
  const isAvailable = Boolean(activeQueryDates && !isChecking && availability?.available === true);
  const isUnavailable = Boolean(activeQueryDates && !isChecking && availability?.available === false);

  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const canBook = isAvailable && !isStaffOrAdmin;

  const handleBookNow = () => {
    if (!activeQueryDates || !isAvailable || isStaffOrAdmin) {
      return;
    }

    setDrawerOpen(false);

    if (!user) {
      const nextParams = new URLSearchParams();
      nextParams.set("checkIn", activeQueryDates.checkIn);
      nextParams.set("checkOut", activeQueryDates.checkOut);
      nextParams.set("guests", String(guests));
      const nextUrl = `/rooms/${room.id}?${nextParams.toString()}`;
      router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    if (user.role === "guest") {
      dispatch(setBookingRoom(room.id));
      dispatch(setBookingDates(activeQueryDates));
      dispatch(setBookingGuests(guests));
      dispatch(setBookingStep(0));
      router.push(`/book/${room.id}`);
    }
  };

  const renderControls = (idPrefix: string) => (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`${idPrefix}-dates`}
          className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
        >
          Dates
        </label>
        <DateRangePicker
          id={`${idPrefix}-dates`}
          className="w-full"
          format="YYYY-MM-DD"
          placeholder={["Check-in", "Check-out"]}
          value={dateRange}
          disabledDate={isPastCalendarDate}
          status={rangeError ? "error" : undefined}
          onChange={(nextRange) => setDateRange(nextRange)}
        />
      </div>

      <div>
        <span
          id={`${idPrefix}-guests-label`}
          className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
        >
          Guests
        </span>
        <div
          role="group"
          aria-labelledby={`${idPrefix}-guests-label`}
          className="flex min-h-[44px] items-center justify-between rounded-md border border-line-strong bg-neutral-0 px-1 transition-colors duration-[120ms] hover:border-green-300 focus-within:border-green-600 focus-within:shadow-focus-ring lg:h-10 lg:min-h-[40px]"
        >
          <Button
            type="text"
            icon={<MinusOutlined aria-hidden="true" />}
            aria-label="Decrease guests"
            disabled={guests <= 1}
            onClick={() => setGuests((prev) => Math.max(1, prev - 1))}
            className="flex h-11 w-11 items-center justify-center lg:h-9 lg:w-9"
          />
          <span
            data-testid={`${idPrefix}-guests-value`}
            className="font-sans text-[14px] leading-[20px] tabular text-ink"
          >
            {plural(guests, "guest")}
          </span>
          <Button
            type="text"
            icon={<PlusOutlined aria-hidden="true" />}
            aria-label="Increase guests"
            disabled={guests >= room.capacity}
            onClick={() => setGuests((prev) => Math.min(room.capacity, prev + 1))}
            className="flex h-11 w-11 items-center justify-center lg:h-9 lg:w-9"
          />
        </div>
      </div>

      <div className="space-y-3 pt-1" aria-live="polite">
        {rangeError ? (
          <p className="m-0 font-sans text-[13px] leading-[20px] text-error">{rangeError}</p>
        ) : !validPendingDates ? (
          <div className="space-y-1">
            <p className="m-0 font-sans text-[13px] leading-[20px] text-muted">
              Select dates to check availability.
            </p>
            <p className="m-0 font-sans text-[13px] leading-[20px] text-muted">
              Free cancellation up to 24h before check-in
            </p>
          </div>
        ) : isChecking ? (
          <p className="m-0 font-sans text-[13px] leading-[20px] text-muted">
            Checking availability...
          </p>
        ) : isAvailabilityError ? (
          <ErrorState
            variant="alert"
            title="Could not check availability"
            description="Check your connection and try again."
            onRetry={() => {
              void refetchAvailability();
            }}
          />
        ) : isAvailable && availability ? (
          <div className="space-y-3">
            <Tag
              bordered={false}
              className="m-0 inline-flex h-6 items-center gap-1 rounded-sm border-0 bg-success-bg px-2 font-sans text-[12px] font-medium leading-[18px] text-success-text"
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success"
              />
              <span>Available</span>
            </Tag>

            <div className="space-y-2 border-t border-line pt-3 font-sans text-[14px] leading-[22px] text-ink">
              <div className="flex items-center justify-between">
                <span className="text-muted">
                  {plural(availability.nights, "night")} x{" "}
                  {formatPrice(room.pricePerNight, { includeCurrency: false })}
                </span>
                <span className="tabular">{formatPrice(availability.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Taxes (10%)</span>
                <span className="tabular">{formatPrice(availability.taxAmount)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <span className="font-medium text-ink">Total</span>
                <span className="font-serif text-[22px] font-semibold leading-[30px] tabular text-ink">
                  {formatPrice(availability.totalPrice)}
                </span>
              </div>
            </div>
          </div>
        ) : isUnavailable ? (
          <Tag
            bordered={false}
            className="m-0 inline-flex h-6 items-center gap-1 rounded-sm border-0 bg-error-bg px-2 font-sans text-[12px] font-medium leading-[18px] text-error"
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-error"
            />
            <span>Not available for these dates</span>
          </Tag>
        ) : null}
      </div>
    </div>
  );

  const renderBookButton = (testId: string) => (
    <Tooltip title={isStaffOrAdmin ? "Guests only" : undefined}>
      <span className="block w-full">
        <Button
          type="primary"
          size="large"
          block
          disabled={!canBook}
          onClick={handleBookNow}
          data-testid={testId}
        >
          Book now
        </Button>
      </span>
    </Tooltip>
  );

  const mobileDatesLabel = validPendingDates
    ? `${validPendingDates.checkIn} - ${validPendingDates.checkOut} · ${plural(guests, "guest")}`
    : "Select dates";

  return (
    <>
      <div
        data-testid="desktop-booking-card"
        className="hidden rounded-lg border border-line bg-neutral-0 p-6 lg:sticky lg:top-[88px] lg:block"
      >
        <div className="mb-5">
          <Price amount={room.pricePerNight} perNight size="lg" />
        </div>

        {renderControls("booking-card")}

        <div className="mt-5">{renderBookButton("desktop-book-now")}</div>
      </div>

      <div
        data-testid="mobile-booking-bar"
        className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-center justify-between gap-3 border-t border-line bg-neutral-0 px-4 lg:hidden"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Choose stay dates and guests"
          className="flex min-h-[44px] min-w-0 cursor-pointer flex-col justify-center border-0 bg-transparent p-0 text-left"
        >
          <Price
            amount={isAvailable && availability ? availability.totalPrice : room.pricePerNight}
            perNight={!isAvailable}
            size="sm"
          />
          <span className="mt-0.5 flex items-center gap-1.5 truncate font-sans text-[13px] font-medium leading-[18px] text-green-600">
            <CalendarOutlined className="text-[14px]" aria-hidden="true" />
            <span className="truncate">{mobileDatesLabel}</span>
          </span>
        </button>

        <div className="w-[140px] shrink-0">{renderBookButton("mobile-book-now")}</div>
      </div>

      <Drawer
        title={
          <span className="font-serif text-[20px] font-medium leading-[28px] text-ink">
            Select dates and guests
          </span>
        }
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        styles={{
          wrapper: { maxWidth: "100vw" },
        }}
      >
        <div className="space-y-6">
          <div>
            <Price amount={room.pricePerNight} perNight size="lg" />
          </div>

          {renderControls("booking-drawer")}

          <div className="flex flex-col-reverse gap-3 pt-2">
            <Button size="large" block onClick={() => setDrawerOpen(false)}>
              Done
            </Button>
            {renderBookButton("drawer-book-now")}
          </div>
        </div>
      </Drawer>
    </>
  );
}

export function BookingCard({ room }: BookingCardProps) {
  const searchParams = useSearchParams();
  const initialParams = parseInitialBookingUrlParams(searchParams, room.capacity);
  const searchParamsKey = searchParams.toString();

  return (
    <BookingCardContent
      key={`${room.id}-${searchParamsKey}`}
      room={room}
      initialParams={initialParams}
    />
  );
}
