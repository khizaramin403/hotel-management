"use client";

import { useRouter } from "next/navigation";
import type { Booking } from "@hotel/shared";
import { Button, Card, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import { EmptyState, ErrorState, StatusTag } from "@/components/ui";
import { bookingReference, formatPrice } from "@/lib/format";
import { RECENT_BOOKINGS_LIMIT } from "../hooks/useDashboardQueries";

const SKELETON_ROWS = [1, 2, 3, 4, 5] as const;

const RECENT_BOOKINGS_COLUMNS: TableColumnsType<Booking> = [
  {
    title: "Booking",
    dataIndex: "id",
    key: "booking",
    render: (id: number) => (
      <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
        {bookingReference(id)}
      </span>
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
];

export interface RecentBookingsCardProps {
  bookings: readonly Booking[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function RecentBookingsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading recent bookings"
      className="rounded-md border border-line bg-neutral-0 p-3"
    >
      <div className="space-y-3">
        {SKELETON_ROWS.map((row) => (
          <Skeleton
            key={row}
            active
            title={false}
            paragraph={{ rows: 1, width: "100%" }}
            className="border-b border-line pb-2.5 last:border-b-0 last:pb-0"
          />
        ))}
      </div>
    </div>
  );
}

export function RecentBookingsCard({
  bookings,
  isLoading,
  isError,
  onRetry,
}: RecentBookingsCardProps) {
  const router = useRouter();
  const visibleBookings = bookings.slice(0, RECENT_BOOKINGS_LIMIT);

  return (
    <Card
      className="rounded-lg border-line bg-neutral-0"
      styles={{ body: { padding: 24 } }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 font-sans text-[18px] font-semibold leading-[26px] text-ink">
          Recent bookings
        </h2>
        <Button
          type="text"
          size="small"
          href="/dashboard/bookings"
          className="no-underline"
          onClick={(event) => {
            if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              router.push("/dashboard/bookings");
            }
          }}
        >
          View all
        </Button>
      </div>

      {isLoading ? (
        <RecentBookingsSkeleton />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load recent bookings"
          description="Check your connection and try again."
          onRetry={onRetry}
        />
      ) : visibleBookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="New guest reservations will appear here."
        />
      ) : (
        <div
          data-testid="recent-bookings-table"
          className="dashboard-compact-table overflow-hidden rounded-md border border-line bg-neutral-0"
        >
          <Table<Booking>
            rowKey="id"
            size="small"
            columns={RECENT_BOOKINGS_COLUMNS}
            dataSource={visibleBookings}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        </div>
      )}
    </Card>
  );
}
