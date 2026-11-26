"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Booking } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Modal, Pagination, Popconfirm, Skeleton, Table, Tabs } from "antd";
import type { TableColumnsType, TabsProps } from "antd";
import { EmptyState, ErrorState, PageHeader, StatusTag } from "@/components/ui";
import { cancelBooking, normalizeApiError } from "@/lib/api";
import { bookingReference, formatDateRange, formatPrice } from "@/lib/format";
import { useMyBookingsQuery } from "../hooks/useMyBookingsQuery";
import { usePaymentConfirmation } from "../hooks/usePaymentConfirmation";
import { updateMyBookingsCache } from "../lib/bookingCache";
import {
  buildMyBookingsUrl,
  parseMyBookingsSearchParams,
  type MyBookingsTab,
} from "../lib/myBookingsParams";
import { BookingDetailDrawer } from "./BookingDetailDrawer";
import { BookingRow, canCancelBooking } from "./BookingRow";
import { PaymentWaitingPanel } from "./PaymentWaitingPanel";

const SKELETON_ROWS = [1, 2, 3, 4, 5] as const;

const TAB_ITEMS: TabsProps["items"] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const EMPTY_STATE_COPY: Record<MyBookingsTab, { title: string; description: string }> = {
  upcoming: {
    title: "No upcoming bookings",
    description: "Browse rooms to make your first booking.",
  },
  past: {
    title: "No past bookings",
    description: "Completed reservations will appear here.",
  },
  cancelled: {
    title: "No cancelled bookings",
    description: "Cancelled reservations will appear here.",
  },
};

export function MyBookingsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading bookings"
      className="mx-auto max-w-container px-4 py-8 lg:px-6"
    >
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

function MyBookingsListSkeleton() {
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

export function MyBookingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { tab, statuses, page, limit } = parseMyBookingsSearchParams(searchParams);
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } = useMyBookingsQuery({
    status: statuses,
    page,
    limit,
  });

  const [drawerBooking, setDrawerBooking] = useState<Booking | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  const {
    session: paymentSession,
    isStartingPayment,
    isBookingCancelled,
    isPaymentFailed,
    isTimedOut,
    simulatingStatus,
    startPaymentForBooking,
    simulateOutcome,
    resetSession,
  } = usePaymentConfirmation({
    onConfirmed: (confirmedBooking) => {
      updateMyBookingsCache(queryClient, confirmedBooking);
      setDrawerBooking((prev) => (prev?.id === confirmedBooking.id ? confirmedBooking : prev));
      setPayingBookingId(null);
      resetSession();
      message?.success?.({
        content: "Booking confirmed. A confirmation was sent to your email.",
        duration: 3,
      });
    },
    onError: (msg) => {
      message?.error?.({ content: msg, duration: 5 });
    },
  });

  const bookings = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const isInitialLoading = isPending || (isFetching && !data);

  const handleTabChange = (nextKey: string) => {
    const nextTab = nextKey as MyBookingsTab;
    router.push(buildMyBookingsUrl(nextTab, 1));
  };

  const handlePageChange = (nextPage: number) => {
    router.push(buildMyBookingsUrl(tab, nextPage));
  };

  const handleViewBooking = useCallback((booking: Booking) => {
    setDrawerBooking(booking);
  }, []);

  const handleCancelBooking = useCallback(
    async (bookingId: number) => {
      setCancellingId(bookingId);
      try {
        const cancelled = await cancelBooking(bookingId);
        updateMyBookingsCache(queryClient, cancelled);
        setDrawerBooking((prev) => (prev?.id === cancelled.id ? cancelled : prev));
        message?.success?.({ content: "Booking cancelled.", duration: 3 });
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
        setCancellingId((prev) => (prev === bookingId ? null : prev));
      }
    },
    [message, queryClient],
  );

  const handlePayNowBooking = useCallback(
    (booking: Booking) => {
      setPayingBookingId(booking.id);
      void startPaymentForBooking(booking.id).then((started) => {
        if (!started) {
          setPayingBookingId((prev) => (prev === booking.id ? null : prev));
        }
      });
    },
    [startPaymentForBooking],
  );

  const handleClosePaymentModal = () => {
    setPayingBookingId(null);
    resetSession();
  };

  const tableColumns: TableColumnsType<Booking> = useMemo(
    () => [
      {
        title: "Booking",
        dataIndex: "id",
        key: "booking",
        render: (id: number) => (
          <span className="font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
            {bookingReference(id)}
          </span>
        ),
      },
      {
        title: "Room",
        key: "room",
        render: (_: unknown, record: Booking) => (
          <span className="font-sans text-[14px] leading-[22px] text-ink">
            {record.roomType} {record.roomNumber}
          </span>
        ),
      },
      {
        title: "Dates",
        key: "dates",
        sorter: (a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut),
        sortDirections: ["ascend", "descend"],
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
          const isRowCancelling = cancellingId === record.id;
          const isRowPaying = payingBookingId === record.id && isStartingPayment;

          return (
            <div className="inline-flex items-center justify-end gap-1">
              <Button type="text" size="small" onClick={() => handleViewBooking(record)}>
                View
              </Button>

              {record.status === "pending" ? (
                <Button
                  type="text"
                  size="small"
                  loading={isRowPaying}
                  disabled={isRowCancelling || isRowPaying}
                  onClick={() => handlePayNowBooking(record)}
                >
                  Pay now
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
                    loading={isRowCancelling}
                    disabled={isRowPaying}
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
      cancellingId,
      handleCancelBooking,
      handlePayNowBooking,
      handleViewBooking,
      isStartingPayment,
      payingBookingId,
    ],
  );

  const emptyCopy = EMPTY_STATE_COPY[tab];

  return (
    <section className="mx-auto max-w-container px-4 py-8 lg:px-6">
      <PageHeader
        title="My bookings"
        subtitle="View, manage and cancel your reservations."
        variant="h1"
      />

      <div className="mt-6">
        <Tabs
          activeKey={tab}
          items={TAB_ITEMS}
          onChange={handleTabChange}
          tabBarStyle={{ height: 48 }}
          className="my-bookings-tabs"
        />
      </div>

      {isInitialLoading ? (
        <MyBookingsListSkeleton />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load your bookings"
          description="Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <EmptyState
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              <Button type="primary" onClick={() => router.push("/")}>
                Browse rooms
              </Button>
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
            data-testid="my-bookings-table"
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
                showSizeChanger: false,
                position: ["bottomRight"],
                onChange: handlePageChange,
              }}
            />
          </div>

          <div data-testid="my-bookings-mobile-list" className="space-y-3 md:hidden">
            {bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                isCancelling={cancellingId === booking.id}
                isPaying={payingBookingId === booking.id && isStartingPayment}
                onView={handleViewBooking}
                onCancel={handleCancelBooking}
                onPayNow={handlePayNowBooking}
              />
            ))}

            {total > 0 ? (
              <div className="pt-2 flex justify-center">
                <Pagination
                  current={page}
                  pageSize={limit}
                  total={total}
                  showSizeChanger={false}
                  onChange={handlePageChange}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <BookingDetailDrawer
        booking={drawerBooking}
        isCancelling={drawerBooking !== null && cancellingId === drawerBooking.id}
        isPaying={
          drawerBooking !== null && payingBookingId === drawerBooking.id && isStartingPayment
        }
        onClose={() => setDrawerBooking(null)}
        onCancel={handleCancelBooking}
        onPayNow={handlePayNowBooking}
      />

      <Modal
        open={paymentSession !== null}
        width={520}
        footer={null}
        onCancel={handleClosePaymentModal}
        title={
          <span className="font-serif text-[20px] font-medium leading-[28px] text-ink">
            Complete payment
          </span>
        }
        destroyOnHidden
      >
        {paymentSession ? (
          <PaymentWaitingPanel
            showCardChrome={false}
            isTimedOut={isTimedOut}
            isPaymentFailed={isPaymentFailed}
            isBookingCancelled={isBookingCancelled}
            isRetryingPayment={isStartingPayment}
            simulatingStatus={simulatingStatus}
            cancelledActionHref={
              drawerBooking ? `/rooms/${drawerBooking.roomId}` : "/"
            }
            cancelledActionLabel="Browse rooms"
            onSimulate={(status) => {
              void simulateOutcome(status);
            }}
            onRetryPayment={() => {
              void startPaymentForBooking(paymentSession.bookingId);
            }}
          />
        ) : null}
      </Modal>
    </section>
  );
}
