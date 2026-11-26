"use client";

import { ROOM_TYPES, type RoomType } from "@hotel/shared";
import { Select } from "antd";
import { Chip } from "@/components/ui";
import {
  getSelectedPricePresetId,
  PRICE_FILTER_PRESETS,
  ROOM_SORT_OPTIONS,
  type PriceFilterPreset,
  type RoomSortOption,
} from "../lib/searchParams";

export interface RoomsFilterBarProps {
  selectedType?: RoomType;
  minPrice?: number;
  maxPrice?: number;
  selectedSort?: RoomSortOption;
  onSelectType: (type?: RoomType) => void;
  onSelectPricePreset: (preset?: PriceFilterPreset) => void;
  onSelectSort: (sort?: RoomSortOption) => void;
}

export function RoomsFilterBar({
  selectedType,
  minPrice,
  maxPrice,
  selectedSort,
  onSelectType,
  onSelectPricePreset,
  onSelectSort,
}: RoomsFilterBarProps) {
  const selectedPriceId = getSelectedPricePresetId(minPrice, maxPrice);

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Room type filters" className="flex flex-wrap items-center gap-2">
          <Chip
            label="All"
            selected={selectedType === undefined}
            onToggle={() => onSelectType(undefined)}
          />
          {ROOM_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              selected={selectedType === type}
              onToggle={(nextSelected) => onSelectType(nextSelected ? type : undefined)}
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="mx-1 hidden h-6 w-px bg-line sm:block"
        />

        <div role="group" aria-label="Price range filters" className="flex flex-wrap items-center gap-2">
          {PRICE_FILTER_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.label}
              selected={selectedPriceId === preset.id}
              onToggle={(nextSelected) => onSelectPricePreset(nextSelected ? preset : undefined)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 self-start lg:shrink-0 lg:self-auto">
        <label
          htmlFor="rooms-sort-select"
          className="shrink-0 font-sans text-[14px] font-medium leading-[20px] text-ink"
        >
          Sort
        </label>
        <Select<RoomSortOption | "">
          id="rooms-sort-select"
          allowClear
          placeholder="Default order"
          value={selectedSort}
          options={[...ROOM_SORT_OPTIONS]}
          onChange={(value) => onSelectSort(value ? value : undefined)}
          className="w-[200px]"
        />
      </div>
    </div>
  );
}
