"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  calcTotals,
  isValidCalendarDate,
  MAX_STAY_NIGHTS,
  nightsBetween,
} from "@hotel/shared";
import { Button, Skeleton, Steps } from "antd";
import { ErrorState } from "@/components/ui";
import { useRoomAvailabilityQuery, useRoomQuery } from "@/features/rooms";
import { ApiClientError } from "@/lib/api";
import { getTodayCalendarDate } from "@/lib/datePicker";
import { attachBookingDraftPersistence } from "@/store/bookingDraftStorage";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { selectAuthUser } from "@/store/slices/authSlice";
import {
  selectBookingCheckIn,
  selectBookingCheckOut,
  selectBookingGuestDetails,
  selectBookingGuests,
  selectBookingRoomId,
  selectBookingStep,
  setBookingStep,
  setGuestDetails,
  type BookingDraftState,
  type BookingStep,
} from "@/store/slices/bookingDraftSlice";
import { BookingGuestDetailsForm } from "./BookingGuestDetailsForm";
import { BookingRoomStep } from "./BookingRoomStep";
import { BookingSummaryCard } from "./BookingSummaryCard";

export interface BookingFlowViewProps {
  roomId: number;
}

const STEP_ITEMS = [{ title: "Room" }, { title: "Details" }, { title: "Payment" }];

function BookingFlowSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading booking details"
      className="space-y-8"
    >
      <div className="mx-auto max-w-[640px]">
        <Skeleton.Input active block />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="order-1 rounded-lg border border-line bg-neutral-0 p-6 lg:order-2 lg:col-span-4">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-md bg-neutral-100">
            <Skeleton.Node
              active
              className="!block !h-full !w-full"
              style={{ width: "100%", height: "100%", borderRadius: 0 }}
            />
          </div>
          <div className="mt-4">
            <Skeleton active title={{ width: "70%" }} paragraph={{ rows: 3 }} />
          </div>
        </div>

        <div className="order-2 rounded-lg border border-line bg-neutral-0 p-6 lg:order-1 lg:col-span-8">
          <Skeleton active title={{ width: "40%" }} paragraph={{ rows: 5 }} />
        </div>
      </div>
    </div>
  );
}

function buildRoomPageHref(
  roomId: number,
  checkIn: string,
  checkOut: string,
  guests: number,
): string {
  const params = new URLSearchParams({
    checkIn,
    checkOut,
    guests: String(guests),
  });
  return `/rooms/${roomId}?${params.toString()}`;
}

function isBookingDraftValidForRoom(
  draft: Pick<BookingDraftState, "roomId" | "checkIn" | "checkOut" | "guests">,
  roomId: number,
  today: string,
): boolean {
  if (!Number.isInteger(roomId) || roomId <= 0) {
    return false;
  }
  if (draft.roomId !== roomId || !draft.checkIn || !draft.checkOut || draft.guests < 1) {
    return false;
  }
  if (!isValidCalendarDate(draft.checkIn) || !isValidCalendarDate(draft.checkOut)) {
    return false;
  }
  if (draft.checkIn < today) {
    return false;
  }
  const nights = nightsBetween(draft.checkIn, draft.checkOut);
  return nights > 0 && nights <= MAX_STAY_NIGHTS;
}

export function BookingFlowView({ roomId }: BookingFlowViewProps) {
  const router = useRouter();
  const store = useAppStore();
  const dispatch = useAppDispatch();

  const authUser = useAppSelector(selectAuthUser);
  const draftRoomId = useAppSelector(selectBookingRoomId);
  const draftCheckIn = useAppSelector(selectBookingCheckIn);
  const draftCheckOut = useAppSelector(selectBookingCheckOut);
  const draftGuests = useAppSelector(selectBookingGuests);
  const draftGuestDetails = useAppSelector(selectBookingGuestDetails);
  const currentStep = useAppSelector(selectBookingStep);

  const isValidRoomId = Number.isInteger(roomId) && roomId > 0;
  const today = getTodayCalendarDate();

  const isDraftValidForRoom = isBookingDraftValidForRoom(
    {
      roomId: draftRoomId,
      checkIn: draftCheckIn,
      checkOut: draftCheckOut,
      guests: draftGuests,
    },
    roomId,
    today,
  );

  useEffect(() => {
    const detach = attachBookingDraftPersistence(store);
    const currentDraft = store.getState().bookingDraft;

    if (isValidRoomId && !isBookingDraftValidForRoom(currentDraft, roomId, getTodayCalendarDate())) {
      router.replace(`/rooms/${roomId}`);
    }

    return detach;
  }, [draftCheckIn, draftCheckOut, draftGuests, draftRoomId, isValidRoomId, roomId, router, store]);

  const queryRoomId = isDraftValidForRoom ? roomId : Number.NaN;
  const availabilityQueryDates =
    isDraftValidForRoom && draftCheckIn && draftCheckOut
      ? { checkIn: draftCheckIn, checkOut: draftCheckOut }
      : null;

  const {
    data: room,
    isPending: isRoomPending,
    isError: isRoomError,
    error: roomError,
    refetch: refetchRoom,
  } = useRoomQuery(queryRoomId);

  const {
    data: availability,
    isPending: isAvailabilityPending,
    isFetching: isAvailabilityFetching,
    isError: isAvailabilityError,
    refetch: refetchAvailability,
  } = useRoomAvailabilityQuery(queryRoomId, availabilityQueryDates, {
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isNotFound =
    !isValidRoomId ||
    (roomError instanceof ApiClientError &&
      (roomError.code === "NOT_FOUND" || roomError.status === 404));

  const isCheckingAvailability =
    availabilityQueryDates !== null && (isAvailabilityPending || isAvailabilityFetching);
  const isAvailable = Boolean(!isCheckingAvailability && availability?.available === true);
  const isUnavailable = Boolean(!isCheckingAvailability && availability?.available === false);

  const handleStepClick = (nextIndex: number) => {
    if (nextIndex < currentStep && (nextIndex === 0 || nextIndex === 1 || nextIndex === 2)) {
      dispatch(setBookingStep(nextIndex as BookingStep));
    }
  };

  return (
    <section className="mx-auto max-w-container px-4 py-8 lg:px-6">
      {!isValidRoomId || (isRoomError && isNotFound) ? (
        <ErrorState
          status="404"
          title="Room not found"
          description="The room you are looking for could not be found."
          action={
            <Button type="primary" onClick={() => router.push("/")}>
              Back to home
            </Button>
          }
        />
      ) : !isDraftValidForRoom || isRoomPending ? (
        <BookingFlowSkeleton />
      ) : isRoomError || !room || !draftCheckIn || !draftCheckOut ? (
        <ErrorState
          variant="alert"
          title="Could not load booking details"
          description="Check your connection and try again."
          onRetry={() => {
            void refetchRoom();
          }}
        />
      ) : (
        (() => {
          const fallbackNights = nightsBetween(draftCheckIn, draftCheckOut);
          const fallbackTotals = calcTotals(fallbackNights, room.pricePerNight);
          const nights = availability?.nights ?? fallbackNights;
          const subtotal = availability?.subtotal ?? fallbackTotals.subtotal;
          const taxAmount = availability?.taxAmount ?? fallbackTotals.taxAmount;
          const totalPrice = availability?.totalPrice ?? fallbackTotals.totalPrice;
          const roomPageHref = buildRoomPageHref(
            room.id,
            draftCheckIn,
            draftCheckOut,
            draftGuests,
          );

          return (
            <div>
              <h1 className="sr-only">
                Book {room.type} Room {room.number}
              </h1>

              <div className="mx-auto mb-8 max-w-[640px]">
                <Steps current={currentStep} onChange={handleStepClick} items={STEP_ITEMS} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                <div className="order-2 lg:order-1 lg:col-span-8">
                  {currentStep === 0 ? (
                    <BookingRoomStep
                      room={room}
                      checkIn={draftCheckIn}
                      checkOut={draftCheckOut}
                      guests={draftGuests}
                      nights={nights}
                      roomPageHref={roomPageHref}
                      isCheckingAvailability={isCheckingAvailability}
                      isAvailable={isAvailable}
                      isUnavailable={isUnavailable}
                      isAvailabilityError={isAvailabilityError}
                      onRetryAvailability={() => {
                        void refetchAvailability();
                      }}
                      onBackToRoom={() => router.push(roomPageHref)}
                      onContinue={() => dispatch(setBookingStep(1))}
                    />
                  ) : currentStep === 1 ? (
                    <BookingGuestDetailsForm
                      initialDetails={draftGuestDetails}
                      prefillName={authUser?.name ?? ""}
                      prefillEmail={authUser?.email ?? ""}
                      onSyncDraft={(details) => dispatch(setGuestDetails(details))}
                      onBack={(details) => {
                        dispatch(setGuestDetails(details));
                        dispatch(setBookingStep(0));
                      }}
                      onContinue={(details) => {
                        dispatch(setGuestDetails(details));
                        dispatch(setBookingStep(2));
                      }}
                    />
                  ) : (
                    <div className="space-y-4 rounded-lg border border-line bg-neutral-0 p-6">
                      <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
                        Payment
                      </h2>
                      <p className="m-0 font-sans text-[14px] leading-[22px] text-muted">
                        Payment confirmation will be completed in the next step.
                      </p>
                      <div className="pt-2">
                        <Button
                          onClick={() => dispatch(setBookingStep(1))}
                          className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="order-1 lg:order-2 lg:col-span-4 lg:sticky lg:top-[88px]">
                  <BookingSummaryCard
                    room={room}
                    checkIn={draftCheckIn}
                    checkOut={draftCheckOut}
                    guests={draftGuests}
                    nights={nights}
                    subtotal={subtotal}
                    taxAmount={taxAmount}
                    totalPrice={totalPrice}
                  />
                </aside>
              </div>
            </div>
          );
        })()
      )}
    </section>
  );
}
