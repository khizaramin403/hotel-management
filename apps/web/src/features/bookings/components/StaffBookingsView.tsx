"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Booking } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Pagination, Popconfirm, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import { EmptyState, ErrorState, PageHeader, StatusTag } from "@/components/ui";
import { cancelBooking, normalizeApiError, updateBookingStatus } from "@/lib/api";
import { bookingReference, formatDateRange, formatPrice } from "@/lib/format";
import { useStaffBookingsQuery } from "../hooks/useStaffBookingsQuery";
import { updateStaffBookingsCache } from "../lib/bookingCache";
import {
  buildUpdatedStaffBookingsUrl,
  parseStaffBookingsSearchParams,
  STAFF_BOOKINGS_PAGE_SIZE_OPTIONS,
  type StaffBookingsPageSize,
} from "../lib/staffBookingsParams";
import { BookingDetailDrawer } from "./BookingDetailDrawer";
import { BookingRow, canCancelBooking } from "./BookingRow";
import { StaffBookingsFilterBar } from "./StaffBookingsFilterBar";

type PendingRowAction = "check_in" | "check_out" | "cancel";

const SKELETON_ROWS = [1, 2, 3, 4, 5] as const;

function StaffBookingsListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading bookings">
      <div className="hidden rounded-lg border border-line bg-neutral-0 p-4 md:block">
        <div className="space-y-4">
          {SKELETON_ROWS.map((row) => (
            <Skeleton
              key={row}
              active
              title={false}
              paragraph={{ rows: 1, width: "100%" }}
              className="border-b border-line pb-3 last:border-b-0 last:pb-0"
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {[1, 2, 3].map((card) => (
          <div key={card} className="rounded-lg border border-line bg-neutral-0 p-4">
            <Skeleton active title={{ width: "50%" }} paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffBookingsSkeleton() {
  return (
    <section className="space-y-6">
      <PageHeader title="Bookings" variant="h3" />
      <StaffBookingsListSkeleton />
    </section>
  );
}

export function StaffBookingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { statuses, from, to, q, page, limit } = parseStaffBookingsSearchParams(searchParams);
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } =
    useStaffBookingsQuery({
      statuses,
      from,
      to,
      q,
      page,
      limit,
    });

  const [drawerBooking, setDrawerBooking] = useState<Booking | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<number, PendingRowAction>>({});

  const bookings = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const isInitialLoading = isPending || (isFetching && !data);
  const hasActiveFilters = statuses.length > 0 || Boolean(from) || Boolean(to) || Boolean(q);

  const pushUrl = useCallback(
    (url: string) => {
      router.push(url, { scroll: false });
    },
    [router],
  );

  const handleSelectStatus = useCallback(
    (status?: Booking["status"]) => {
      pushUrl(
        buildUpdatedStaffBookingsUrl(searchParams, {
          statuses: status ? [status] : null,
          resetPage: true,
        }),
      );
    },
    [pushUrl, searchParams],
  );

  const handleDateRangeChange = useCallback(
    (nextFrom?: string, nextTo?: string) => {
      pushUrl(
        buildUpdatedStaffBookingsUrl(searchParams, {
          from: nextFrom ?? null,
          to: nextTo ?? null,
          resetPage: true,
        }),
      );
    },
    [pushUrl, searchParams],
  );

  const handleSearchChange = useCallback(
    (nextQuery?: string) => {
      pushUrl(
        buildUpdatedStaffBookingsUrl(searchParams, {
          q: nextQuery ?? null,
          resetPage: true,
        }),
      );
    },
    [pushUrl, searchParams],
  );

  const handlePaginationChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const normalizedSize = (
        STAFF_BOOKINGS_PAGE_SIZE_OPTIONS.includes(nextPageSize as StaffBookingsPageSize)
          ? nextPageSize
          : limit
      ) as StaffBookingsPageSize;
      const sizeChanged = normalizedSize !== limit;

      pushUrl(
        buildUpdatedStaffBookingsUrl(searchParams, {
          limit: normalizedSize,
          page: sizeChanged ? 1 : nextPage,
        }),
      );
    },
    [limit, pushUrl, searchParams],
  );

  const handleClearFilters = useCallback(() => {
    pushUrl("/dashboard/bookings");
  }, [pushUrl]);

  const setRowActionPending = useCallback((bookingId: number, action: PendingRowAction | null) => {
    setPendingActions((prev) => {
      if (action === null) {
        if (!(bookingId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[bookingId];
        return next;
      }
      return { ...prev, [bookingId]: action };
    });
  }, []);

  const handleViewBooking = useCallback((booking: Booking) => {
    setDrawerBooking(booking);
  }, []);

  const handleStatusTransition = useCallback(
    async (bookingId: number, targetStatus: "checked_in" | "checked_out") => {
      const pendingKey: PendingRowAction =
        targetStatus === "checked_in" ? "check_in" : "check_out";
      setRowActionPending(bookingId, pendingKey);

      try {
        const updated = await updateBookingStatus(bookingId, { status: targetStatus });
        updateStaffBookingsCache(queryClient, updated);
        setDrawerBooking((prev) => (prev?.id === updated.id ? updated : prev));
        message?.success?.({
          content:
            targetStatus === "checked_in"
              ? `${bookingReference(updated.id)} checked in.`
              : `${bookingReference(updated.id)} checked out.`,
          duration: 3,
        });
      } catch (error: unknown) {
        const apiError = normalizeApiError(error);
        if (apiError.code === "INVALID_STATE" || apiError.status === 409) {
          message?.error?.({
            content:
              targetStatus === "checked_in"
                ? "This booking can only be checked in when its status is Confirmed."
                : "This booking can only be checked out after check-in.",
            duration: 5,
          });
          return;
        }
        message?.error?.({
          content:
            apiError.message || "Could not update booking. Check your connection and try again.",
          duration: 5,
        });
      } finally {
        setRowActionPending(bookingId, null);
      }
    },
    [message, queryClient, setRowActionPending],
  );

  const handleCheckInBooking = useCallback(
    (bookingId: number) => handleStatusTransition(bookingId, "checked_in"),
    [handleStatusTransition],
  );

  const handleCheckOutBooking = useCallback(
    (bookingId: number) => handleStatusTransition(bookingId, "checked_out"),
    [handleStatusTransition],
  );

  const handleCancelBooking = useCallback(
    async (bookingId: number) => {
      setRowActionPending(bookingId, "cancel");

      try {
        const cancelled = await cancelBooking(bookingId);
        updateStaffBookingsCache(queryClient, cancelled);
        setDrawerBooking((prev) => (prev?.id === cancelled.id ? cancelled : prev));
        message?.success?.({
          content: `${bookingReference(cancelled.id)} cancelled.`,
          duration: 3,
        });
      } catch (error: unknown) {
        const apiError = normalizeApiError(error);
        if (apiError.code === "INVALID_STATE" || apiError.status === 409) {
          message?.error?.({
            content: "This booking can no longer be cancelled after check-in or completion.",
            duration: 5,
          });
          return;
        }
        message?.error?.({
          content:
            apiError.message || "Could not cancel booking. Check your connection and try again.",
          duration: 5,
        });
      } finally {
        setRowActionPending(bookingId, null);
      }
    },
    [message, queryClient, setRowActionPending],
  );

  const tableColumns: TableColumnsType<Booking> = useMemo(
    () => [
      {
        title: "Reference",
        dataIndex: "id",
        key: "reference",
        render: (id: number) => (
          <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
            {bookingReference(id)}
          </span>
        ),
      },
      {
        title: "Guest",
        dataIndex: "guestName",
        key: "guest",
        render: (guestName: string) => (
          <span className="font-sans text-[14px] leading-[22px] text-ink">{guestName}</span>
        ),
      },
      {
        title: "Room",
        key: "room",
        render: (_: unknown, record: Booking) => (
          <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] text-ink">
            {record.roomType} {record.roomNumber}
          </span>
        ),
      },
      {
        title: "Dates",
        key: "dates",
        render: (_: unknown, record: Booking) => (
          <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] text-ink">
            {formatDateRange(record.checkIn, record.checkOut, { includeYear: false })}
          </span>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: Booking["status"]) => <StatusTag status={status} kind="booking" />,
      },
      {
        title: "Total",
        dataIndex: "totalPrice",
        key: "total",
        align: "right",
        render: (totalPrice: number) => (
          <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
            {formatPrice(totalPrice)}
          </span>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, record: Booking) => {
          const rowPending = pendingActions[record.id];
          const isRowBusy = rowPending !== undefined;

          return (
            <div className="inline-flex items-center justify-end gap-1">
              <Button type="text" size="small" onClick={() => handleViewBooking(record)}>
                View
              </Button>

              {record.status === "confirmed" ? (
                <Button
                  type="text"
                  size="small"
                  loading={rowPending === "check_in"}
                  disabled={isRowBusy}
                  onClick={() => {
                    void handleCheckInBooking(record.id);
                  }}
                >
                  Check in
                </Button>
              ) : null}

              {record.status === "checked_in" ? (
                <Button
                  type="text"
                  size="small"
                  loading={rowPending === "check_out"}
                  disabled={isRowBusy}
                  onClick={() => {
                    void handleCheckOutBooking(record.id);
                  }}
                >
                  Check out
                </Button>
              ) : null}

              {canCancelBooking(record) ? (
                <Popconfirm
                  title="Cancel this booking?"
                  description="This cannot be undone."
                  okText="Cancel booking"
                  cancelText="Keep"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleCancelBooking(record.id)}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    loading={rowPending === "cancel"}
                    disabled={isRowBusy}
                  >
                    Cancel
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          );
        },
      },
    ],
    [
      handleCancelBooking,
      handleCheckInBooking,
      handleCheckOutBooking,
      handleViewBooking,
      pendingActions,
    ],
  );

  const drawerPendingAction = drawerBooking ? pendingActions[drawerBooking.id] : undefined;

  return (
    <section className="space-y-6">
      <PageHeader title="Bookings" variant="h3" />

      <StaffBookingsFilterBar
        selectedStatuses={statuses}
        from={from}
        to={to}
        searchQuery={q ?? ""}
        onSelectStatus={handleSelectStatus}
        onDateRangeChange={handleDateRangeChange}
        onSearchChange={handleSearchChange}
      />

      {isInitialLoading ? (
        <StaffBookingsListSkeleton />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load bookings"
          description="Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <EmptyState
            title={hasActiveFilters ? "No bookings match these filters" : "No bookings yet"}
            description={
              hasActiveFilters
                ? "Try adjusting the status, date range, or search term."
                : "Guest reservations will appear here."
            }
            action={
              hasActiveFilters ? <Button onClick={handleClearFilters}>Clear filters</Button> : null
            }
          />
        </div>
      ) : (
        <div
          className={
            isFetching && isPlaceholderData
              ? "opacity-75 transition-opacity duration-[120ms]"
              : "transition-opacity duration-[120ms]"
          }
        >
          <div
            data-testid="staff-bookings-table"
            className="hidden overflow-hidden rounded-lg border border-line bg-neutral-0 md:block"
          >
            <Table<Booking>
              rowKey="id"
              columns={tableColumns}
              dataSource={bookings}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [...STAFF_BOOKINGS_PAGE_SIZE_OPTIONS],
                position: ["bottomRight"],
                onChange: handlePaginationChange,
              }}
            />
          </div>

          <div data-testid="staff-bookings-mobile-list" className="space-y-3 md:hidden">
            {bookings.map((booking) => {
              const rowPending = pendingActions[booking.id];
              return (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  showGuest
                  isCancelling={rowPending === "cancel"}
                  isUpdatingStatus={rowPending === "check_in" || rowPending === "check_out"}
                  onView={handleViewBooking}
                  onCheckIn={handleCheckInBooking}
                  onCheckOut={handleCheckOutBooking}
                  onCancel={handleCancelBooking}
                />
              );
            })}

            {total > 0 ? (
              <div className="flex justify-center pt-2">
                <Pagination
                  current={page}
                  pageSize={limit}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={[...STAFF_BOOKINGS_PAGE_SIZE_OPTIONS]}
                  onChange={handlePaginationChange}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <BookingDetailDrawer
        booking={drawerBooking}
        isCancelling={drawerPendingAction === "cancel"}
        isUpdatingStatus={
          drawerPendingAction === "check_in" || drawerPendingAction === "check_out"
        }
        onClose={() => setDrawerBooking(null)}
        onCheckIn={handleCheckInBooking}
        onCheckOut={handleCheckOutBooking}
        onCancel={handleCancelBooking}
      />
    </section>
  );
}
