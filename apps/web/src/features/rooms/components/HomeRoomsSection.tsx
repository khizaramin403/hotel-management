"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RoomType } from "@hotel/shared";
import { Button, Pagination } from "antd";
import { ErrorState } from "@/components/ui";
import {
  DEFAULT_ROOMS_LIMIT,
  DEFAULT_ROOMS_PAGE,
  useRoomsQuery,
} from "../hooks/useRoomsQuery";
import {
  buildUpdatedRoomsUrl,
  parseRoomsQueryParams,
  type PriceFilterPreset,
  type RoomSortOption,
} from "../lib/searchParams";
import { RoomGrid } from "./RoomGrid";
import { RoomsFilterBar } from "./RoomsFilterBar";

export function HomeRoomsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const queryParams = parseRoomsQueryParams(searchParams);
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } =
    useRoomsQuery(queryParams);

  const isInitialLoading = isPending || (isFetching && !data);
  const rooms = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const currentPage = queryParams.page ?? DEFAULT_ROOMS_PAGE;

  const pushUpdatedUrl = (url: string) => {
    router.push(url, { scroll: false });
  };

  const handleSelectType = (type?: RoomType) => {
    pushUpdatedUrl(
      buildUpdatedRoomsUrl(searchParams, {
        type: type ?? null,
        resetPage: true,
      }),
    );
  };

  const handleSelectPricePreset = (preset?: PriceFilterPreset) => {
    pushUpdatedUrl(
      buildUpdatedRoomsUrl(searchParams, {
        minPrice: preset?.minPrice ?? null,
        maxPrice: preset?.maxPrice ?? null,
        resetPage: true,
      }),
    );
  };

  const handleSelectSort = (sort?: RoomSortOption) => {
    pushUpdatedUrl(
      buildUpdatedRoomsUrl(searchParams, {
        sort: sort ?? null,
        resetPage: true,
      }),
    );
  };

  const handlePageChange = (nextPage: number) => {
    pushUpdatedUrl(
      buildUpdatedRoomsUrl(searchParams, {
        page: nextPage,
      }),
    );

    const target = listTopRef.current;
    if (target && typeof target.scrollIntoView === "function") {
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  const handleClearFilters = () => {
    pushUpdatedUrl("/");
  };

  return (
    <div ref={listTopRef} id="rooms-list-top">
      <RoomsFilterBar
        selectedType={queryParams.type}
        minPrice={queryParams.minPrice}
        maxPrice={queryParams.maxPrice}
        selectedSort={queryParams.sort}
        onSelectType={handleSelectType}
        onSelectPricePreset={handleSelectPricePreset}
        onSelectSort={handleSelectSort}
      />

      {isInitialLoading ? (
        <RoomGrid isLoading skeletonCount={DEFAULT_ROOMS_LIMIT} />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load rooms"
          description="Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <>
          <div
            className={
              isFetching && isPlaceholderData
                ? "opacity-75 transition-opacity duration-[120ms]"
                : "transition-opacity duration-[120ms]"
            }
          >
            <RoomGrid
              rooms={rooms}
              emptyTitle="No rooms match these filters"
              emptyDescription="Try adjusting your dates, room type, or price range."
              emptyAction={<Button onClick={handleClearFilters}>Clear filters</Button>}
            />
          </div>

          {total > 0 ? (
            <div className="mt-8 flex justify-center">
              <Pagination
                align="center"
                current={currentPage}
                pageSize={DEFAULT_ROOMS_LIMIT}
                total={total}
                showSizeChanger={false}
                onChange={handlePageChange}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
