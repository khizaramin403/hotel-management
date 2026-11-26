"use client";

import { useEffect, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { ROOM_TYPES, type RoomType } from "@hotel/shared";
import { Input, Select } from "antd";
import type { AdminRoomStatusFilter } from "../lib/adminRoomsParams";

export const ADMIN_ROOM_SEARCH_DEBOUNCE_MS = 300;

type RoomTypeOptionValue = RoomType | "all";
type RoomStatusOptionValue = AdminRoomStatusFilter | "all";

const TYPE_OPTIONS: { value: RoomTypeOptionValue; label: string }[] = [
  { value: "all", label: "All types" },
  ...ROOM_TYPES.map((type) => ({ value: type, label: type })),
];

const STATUS_OPTIONS: { value: RoomStatusOptionValue; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export interface AdminRoomsFilterBarProps {
  searchQuery?: string;
  selectedType?: RoomType;
  selectedStatus?: AdminRoomStatusFilter;
  onSearchChange: (q?: string) => void;
  onTypeChange: (type?: RoomType) => void;
  onStatusChange: (status?: AdminRoomStatusFilter) => void;
}

export function AdminRoomsFilterBar({
  searchQuery = "",
  selectedType,
  selectedStatus,
  onSearchChange,
  onTypeChange,
  onStatusChange,
}: AdminRoomsFilterBarProps) {
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
    }, ADMIN_ROOM_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [lastSubmittedQuery, searchText]);

  return (
    <div className="rounded-lg border border-line bg-neutral-0 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full md:w-[280px]">
          <label
            htmlFor="admin-rooms-search"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Search
          </label>
          <Input
            id="admin-rooms-search"
            allowClear
            placeholder="Search rooms"
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

        <div className="w-full sm:w-[180px]">
          <label
            htmlFor="admin-rooms-type-select"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Type
          </label>
          <Select<RoomTypeOptionValue>
            id="admin-rooms-type-select"
            className="w-full"
            value={selectedType ?? "all"}
            options={TYPE_OPTIONS}
            onChange={(value) => onTypeChange(value === "all" ? undefined : value)}
          />
        </div>

        <div className="w-full sm:w-[180px]">
          <label
            htmlFor="admin-rooms-status-select"
            className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
          >
            Status
          </label>
          <Select<RoomStatusOptionValue>
            id="admin-rooms-status-select"
            className="w-full"
            value={selectedStatus ?? "all"}
            options={STATUS_OPTIONS}
            onChange={(value) => onStatusChange(value === "all" ? undefined : value)}
          />
        </div>
      </div>
    </div>
  );
}
