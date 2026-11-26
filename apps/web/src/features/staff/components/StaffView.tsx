"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Pagination, Popconfirm, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { deleteStaff, normalizeApiError } from "@/lib/api";
import { useStaffQuery } from "../hooks/useStaffQuery";
import { removeStaffInCache } from "../lib/staffCache";
import {
  buildUpdatedStaffUrl,
  parseStaffSearchParams,
  STAFF_PAGE_SIZE_OPTIONS,
  type StaffPageSize,
} from "../lib/staffParams";
import { formatStaffCreatedDate, StaffRow } from "./StaffRow";

const StaffFormModal = dynamic(
  () => import("./StaffFormModal").then((mod) => mod.StaffFormModal),
  {
    ssr: false,
    loading: () => (
      <div role="status" aria-live="polite" aria-label="Loading staff form" className="sr-only">
        Loading staff form...
      </div>
    ),
  },
);

const SKELETON_ROWS = [1, 2, 3, 4, 5] as const;

function StaffListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading staff">
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
            <Skeleton active title={{ width: "45%" }} paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffSkeleton() {
  return (
    <section className="space-y-6">
      <PageHeader title="Staff" variant="h3" />
      <StaffListSkeleton />
    </section>
  );
}

export function StaffView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { page, limit, queryParams } = parseStaffSearchParams(searchParams);
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } =
    useStaffQuery(queryParams);

  const [modalOpen, setModalOpen] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const staff = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const isInitialLoading = isPending || (isFetching && !data);

  useEffect(() => {
    if (!isFetching && page > 1 && staff.length === 0 && total > 0 && data) {
      const targetPage = Math.max(1, data.meta.totalPages);
      router.replace(buildUpdatedStaffUrl(searchParams, { page: targetPage }), { scroll: false });
    }
  }, [data, isFetching, page, router, searchParams, staff.length, total]);

  const handleOpenCreate = useCallback(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastTriggerRef.current = document.activeElement;
    } else {
      lastTriggerRef.current = null;
    }
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    window.setTimeout(() => {
      lastTriggerRef.current?.focus();
    }, 0);
  }, []);

  const handlePaginationChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const normalizedSize = (
        STAFF_PAGE_SIZE_OPTIONS.includes(nextPageSize as StaffPageSize) ? nextPageSize : limit
      ) as StaffPageSize;
      const sizeChanged = normalizedSize !== limit;

      router.push(
        buildUpdatedStaffUrl(searchParams, {
          limit: normalizedSize,
          page: sizeChanged ? 1 : nextPage,
        }),
        { scroll: false },
      );
    },
    [limit, router, searchParams],
  );

  const handleDeleteStaff = useCallback(
    async (member: User) => {
      setDeletingStaffId(member.id);
      try {
        await deleteStaff(member.id);
        removeStaffInCache(queryClient, member.id);
        message?.success?.({
          content: `${member.name} removed.`,
          duration: 3,
        });
      } catch (error: unknown) {
        const apiError = normalizeApiError(error);
        message?.error?.({
          content:
            apiError.message ||
            "Could not remove staff account. Check your connection and try again.",
          duration: 5,
        });
      } finally {
        setDeletingStaffId((prev) => (prev === member.id ? null : prev));
      }
    },
    [message, queryClient],
  );

  const tableColumns: TableColumnsType<User> = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        render: (name: string) => (
          <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] text-ink">
            {name}
          </span>
        ),
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        render: (email: string) => (
          <span className="font-sans text-[14px] leading-[22px] text-muted">{email}</span>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (createdAt?: string) => (
          <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] tabular text-ink">
            {formatStaffCreatedDate(createdAt)}
          </span>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, record: User) => {
          const isDeleting = deletingStaffId === record.id;
          return (
            <Popconfirm
              title="Delete staff account?"
              description="This account will lose dashboard access."
              okText="Delete"
              cancelText="Keep"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteStaff(record)}
            >
              <Button
                type="text"
                danger
                size="small"
                loading={isDeleting}
                disabled={isDeleting}
              >
                Delete
              </Button>
            </Popconfirm>
          );
        },
      },
    ],
    [deletingStaffId, handleDeleteStaff],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="Staff"
        variant="h3"
        action={
          <Button type="primary" onClick={handleOpenCreate}>
            Add staff
          </Button>
        }
      />

      {isInitialLoading ? (
        <StaffListSkeleton />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load staff"
          description="Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : staff.length === 0 ? (
        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <EmptyState
            title="No staff accounts yet"
            description="Add a staff member to manage bookings and guest messages."
            action={
              <Button type="primary" onClick={handleOpenCreate}>
                Add staff
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
            data-testid="staff-table"
            className="dashboard-staff-table hidden overflow-hidden rounded-lg border border-line bg-neutral-0 md:block"
          >
            <Table<User>
              rowKey="id"
              columns={tableColumns}
              dataSource={staff}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [...STAFF_PAGE_SIZE_OPTIONS],
                position: ["bottomRight"],
                onChange: handlePaginationChange,
              }}
            />
          </div>

          <div data-testid="staff-mobile-list" className="space-y-3 md:hidden">
            {staff.map((member) => (
              <StaffRow
                key={member.id}
                staff={member}
                isDeleting={deletingStaffId === member.id}
                onDelete={handleDeleteStaff}
              />
            ))}

            {total > 0 ? (
              <div className="flex justify-center pt-2">
                <Pagination
                  current={page}
                  pageSize={limit}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={[...STAFF_PAGE_SIZE_OPTIONS]}
                  onChange={handlePaginationChange}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {modalOpen ? <StaffFormModal onClose={handleCloseModal} /> : null}
    </section>
  );
}
