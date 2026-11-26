"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Room, RoomType } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Modal, Popconfirm, Skeleton, Table, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import { EmptyState, ErrorState, PageHeader, RoomImage, StatusTag } from "@/components/ui";
import { deactivateRoom, normalizeApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { getRoomImageSrc } from "@/lib/images";
import { useRoomsQuery } from "../hooks/useRoomsQuery";
import {
  ADMIN_ROOMS_PAGE_SIZE_OPTIONS,
  buildUpdatedAdminRoomsUrl,
  parseAdminRoomsSearchParams,
  type AdminRoomsPageSize,
  type AdminRoomStatusFilter,
} from "../lib/adminRoomsParams";
import { deactivateRoomInCache } from "../lib/roomCache";
import { AdminRoomsFilterBar } from "./AdminRoomsFilterBar";

type RoomModalMode = "create" | Room;

const SKELETON_ROWS = [1, 2, 3, 4, 5] as const;

function AdminRoomsListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading rooms"
      className="rounded-lg border border-line bg-neutral-0 p-4"
    >
      <div className="space-y-4">
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0"
          >
            <Skeleton.Node
              active
              className="!h-10 !w-14 !shrink-0"
              style={{ width: 56, height: 40, borderRadius: 6 }}
            />
            <Skeleton active title={false} paragraph={{ rows: 1, width: "100%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminRoomsSkeleton() {
  return (
    <section className="space-y-6">
      <PageHeader title="Rooms" variant="h3" />
      <AdminRoomsListSkeleton />
    </section>
  );
}

export function AdminRoomsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { q, type, status, page, limit, queryParams } = parseAdminRoomsSearchParams(searchParams);
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } =
    useRoomsQuery(queryParams);

  const [modalMode, setModalMode] = useState<RoomModalMode | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);

  const rooms = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const isInitialLoading = isPending || (isFetching && !data);
  const hasActiveFilters = Boolean(q) || Boolean(type) || Boolean(status);

  const pushUrl = useCallback(
    (url: string) => {
      router.push(url, { scroll: false });
    },
    [router],
  );

  const handleSearchChange = useCallback(
    (nextQuery?: string) => {
      pushUrl(
        buildUpdatedAdminRoomsUrl(searchParams, {
          q: nextQuery ?? null,
          resetPage: true,
        }),
      );
    },
    [pushUrl, searchParams],
  );

  const handleTypeChange = useCallback(
    (nextType?: RoomType) => {
      pushUrl(
        buildUpdatedAdminRoomsUrl(searchParams, {
          type: nextType ?? null,
          resetPage: true,
        }),
      );
    },
    [pushUrl, searchParams],
  );

  const handleStatusChange = useCallback(
    (nextStatus?: AdminRoomStatusFilter) => {
      pushUrl(
        buildUpdatedAdminRoomsUrl(searchParams, {
          status: nextStatus ?? null,
          resetPage: true,
        }),
      );
    },
    [pushUrl, searchParams],
  );

  const handlePaginationChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const normalizedSize = (
        ADMIN_ROOMS_PAGE_SIZE_OPTIONS.includes(nextPageSize as AdminRoomsPageSize)
          ? nextPageSize
          : limit
      ) as AdminRoomsPageSize;
      const sizeChanged = normalizedSize !== limit;

      pushUrl(
        buildUpdatedAdminRoomsUrl(searchParams, {
          limit: normalizedSize,
          page: sizeChanged ? 1 : nextPage,
        }),
      );
    },
    [limit, pushUrl, searchParams],
  );

  const handleClearFilters = useCallback(() => {
    pushUrl("/dashboard/rooms");
  }, [pushUrl]);

  const handleDeleteRoom = useCallback(
    async (room: Room) => {
      setDeletingRoomId(room.id);
      try {
        await deactivateRoom(room.id);
        deactivateRoomInCache(queryClient, room.id);
        message?.success?.({
          content: `Room ${room.number} deleted.`,
          duration: 3,
        });
      } catch (error: unknown) {
        const apiError = normalizeApiError(error);
        message?.error?.({
          content:
            apiError.message || "Could not delete the room. Check your connection and try again.",
          duration: 5,
        });
      } finally {
        setDeletingRoomId((prev) => (prev === room.id ? null : prev));
      }
    },
    [message, queryClient],
  );

  const tableColumns: TableColumnsType<Room> = useMemo(
    () => [
      {
        title: "Room",
        key: "room",
        render: (_: unknown, record: Room) => (
          <div className="flex items-center gap-3">
            <RoomImage
              src={getRoomImageSrc(record.coverImage, "sm")}
              alt={`Room ${record.number}`}
              width={56}
              height={40}
              sizes="56px"
              className="h-[40px] w-[56px] shrink-0 rounded-[6px]"
            />
            <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] text-ink">
              Room {record.number}
            </span>
          </div>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        render: (roomType: RoomType) => (
          <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] text-ink">
            {roomType}
          </span>
        ),
      },
      {
        title: "Price",
        dataIndex: "pricePerNight",
        key: "price",
        align: "right",
        render: (pricePerNight: number) => (
          <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
            {formatPrice(pricePerNight)}
          </span>
        ),
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "status",
        render: (isActive: boolean) => (
          <StatusTag status={isActive ? "active" : "inactive"} kind="room" />
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, record: Room) => {
          const isDeleting = deletingRoomId === record.id;
          const deleteDisabled = !record.isActive || isDeleting;

          return (
            <div className="inline-flex items-center justify-end gap-1">
              <Button type="text" size="small" onClick={() => setModalMode(record)}>
                Edit
              </Button>

              {record.isActive ? (
                <Popconfirm
                  title="Delete this room?"
                  description="This cannot be undone."
                  okText="Delete"
                  cancelText="Keep"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDeleteRoom(record)}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    loading={isDeleting}
                    disabled={deleteDisabled}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              ) : (
                <Tooltip title="Room is already inactive">
                  <span>
                    <Button type="text" danger size="small" disabled>
                      Delete
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          );
        },
      },
    ],
    [deletingRoomId, handleDeleteRoom],
  );

  const modalTitle =
    modalMode === "create"
      ? "Add room"
      : modalMode
        ? `Edit room ${modalMode.number}`
        : "";

  return (
    <section className="space-y-6">
      <PageHeader
        title="Rooms"
        variant="h3"
        action={
          <Button type="primary" onClick={() => setModalMode("create")}>
            Add room
          </Button>
        }
      />

      <AdminRoomsFilterBar
        searchQuery={q ?? ""}
        selectedType={type}
        selectedStatus={status}
        onSearchChange={handleSearchChange}
        onTypeChange={handleTypeChange}
        onStatusChange={handleStatusChange}
      />

      {isInitialLoading ? (
        <AdminRoomsListSkeleton />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load rooms"
          description="Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : rooms.length === 0 ? (
        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <EmptyState
            title={hasActiveFilters ? "No rooms match these filters" : "No rooms yet"}
            description={
              hasActiveFilters
                ? "Try adjusting the room number, type, or status filter."
                : "Add your first room to start accepting bookings."
            }
            action={
              hasActiveFilters ? (
                <Button onClick={handleClearFilters}>Clear filters</Button>
              ) : (
                <Button type="primary" onClick={() => setModalMode("create")}>
                  Add room
                </Button>
              )
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
            data-testid="admin-rooms-table"
            className="dashboard-rooms-table overflow-hidden rounded-lg border border-line bg-neutral-0"
          >
            <Table<Room>
              rowKey="id"
              columns={tableColumns}
              dataSource={rooms}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [...ADMIN_ROOMS_PAGE_SIZE_OPTIONS],
                position: ["bottomRight"],
                onChange: handlePaginationChange,
              }}
            />
          </div>
        </div>
      )}

      <Modal
        open={modalMode !== null}
        width={520}
        onCancel={() => setModalMode(null)}
        title={
          <span className="font-serif text-[22px] font-medium leading-[30px] text-ink">
            {modalTitle}
          </span>
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={() => setModalMode(null)}>Cancel</Button>
          </div>
        }
        destroyOnHidden
      >
        <p className="m-0 font-sans text-[14px] leading-[22px] text-muted">
          The room create and edit form will be added in the next step.
        </p>
      </Modal>
    </section>
  );
}
