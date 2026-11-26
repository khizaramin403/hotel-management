import {
  createRoomSchema,
  ROOM_TYPES,
  updateRoomSchema,
  type CreateRoomInput,
  type UpdateRoomInput,
} from "@hotel/shared";
import { z } from "zod";

export const MIN_ROOM_PRICE_PKR = 1000;
export const MIN_ROOM_CAPACITY = 1;
export const MAX_ROOM_CAPACITY = 8;

export const ROOM_FACILITY_SUGGESTIONS = [
  "Wi-Fi",
  "Air conditioning",
  "Breakfast",
  "TV",
  "Mini fridge",
  "Balcony",
  "Parking",
] as const;

export const ROOM_FORM_FIELDS = [
  "number",
  "type",
  "pricePerNight",
  "capacity",
  "facilities",
  "description",
  "isActive",
] as const;

export type RoomFormFieldName = (typeof ROOM_FORM_FIELDS)[number];

const baseRoomFormShape = z.object({
  number: z.string(),
  type: z.enum(ROOM_TYPES).optional(),
  pricePerNight: z.number().nullable(),
  capacity: z.number().nullable(),
  facilities: z.array(z.string()),
  description: z.string(),
  isActive: z.boolean(),
});

export type RoomFormValues = z.infer<typeof baseRoomFormShape>;

export function normalizeFacilitiesInput(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawItem of items) {
    const trimmed = rawItem.trim();
    if (!trimmed) {
      continue;
    }
    const dedupeKey = trimmed.toLowerCase();
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

function addFieldIssue(
  ctx: z.RefinementCtx,
  path: RoomFormFieldName,
  message: string,
): void {
  ctx.addIssue({
    code: "custom",
    path: [path],
    message,
  });
}

function validateRoomFormValues(
  mode: "create" | "edit",
  data: RoomFormValues,
  ctx: z.RefinementCtx,
): void {
  const normalizedFacilities = normalizeFacilitiesInput(data.facilities);

  if (data.type === undefined) {
    addFieldIssue(ctx, "type", "Room type is required");
  }
  if (data.pricePerNight === null || Number.isNaN(data.pricePerNight)) {
    addFieldIssue(ctx, "pricePerNight", "Price per night is required");
  }
  if (data.capacity === null || Number.isNaN(data.capacity)) {
    addFieldIssue(ctx, "capacity", "Capacity is required");
  }
  if (!data.number.trim()) {
    addFieldIssue(ctx, "number", "Room number is required");
  }
  if (!data.description.trim()) {
    addFieldIssue(ctx, "description", "Description is required");
  }

  const candidate = {
    number: data.number,
    type: data.type ?? ROOM_TYPES[0],
    pricePerNight:
      data.pricePerNight !== null && !Number.isNaN(data.pricePerNight)
        ? data.pricePerNight
        : MIN_ROOM_PRICE_PKR,
    capacity:
      data.capacity !== null && !Number.isNaN(data.capacity)
        ? data.capacity
        : MIN_ROOM_CAPACITY,
    facilities: normalizedFacilities,
    description: data.description,
    ...(mode === "edit" ? { isActive: data.isActive } : {}),
  };

  const sharedResult =
    mode === "create"
      ? createRoomSchema.safeParse(candidate)
      : updateRoomSchema.safeParse(candidate);

  const hasOutOfBoundsPrice =
    data.pricePerNight !== null &&
    !Number.isNaN(data.pricePerNight) &&
    data.pricePerNight < MIN_ROOM_PRICE_PKR;
  const hasOutOfBoundsCapacity =
    data.capacity !== null &&
    !Number.isNaN(data.capacity) &&
    (data.capacity < MIN_ROOM_CAPACITY || data.capacity > MAX_ROOM_CAPACITY);

  if (!sharedResult.success) {
    for (const issue of sharedResult.error.issues) {
      const rootField = issue.path[0];
      if (rootField === "pricePerNight" && (data.pricePerNight === null || hasOutOfBoundsPrice)) {
        continue;
      }
      if (rootField === "capacity" && (data.capacity === null || hasOutOfBoundsCapacity)) {
        continue;
      }
      if (rootField === "type" && data.type === undefined) continue;
      if (rootField === "number" && !data.number.trim()) continue;
      if (rootField === "description" && !data.description.trim()) continue;

      ctx.addIssue({
        code: "custom",
        path: issue.path,
        message: issue.message,
      });
    }
  }

  if (hasOutOfBoundsPrice) {
    addFieldIssue(ctx, "pricePerNight", "Price per night must be at least PKR 1,000");
  }

  if (hasOutOfBoundsCapacity) {
    addFieldIssue(ctx, "capacity", "Capacity must be between 1 and 8");
  }
}

function buildRoomFormSchema(mode: "create" | "edit") {
  return baseRoomFormShape.superRefine((data, ctx) => {
    validateRoomFormValues(mode, data, ctx);
  });
}

export const createRoomFormSchema = buildRoomFormSchema("create");
export const editRoomFormSchema = buildRoomFormSchema("edit");

export function getRoomFormSchema(mode: "create" | "edit") {
  return mode === "create" ? createRoomFormSchema : editRoomFormSchema;
}

export function buildCreateRoomPayload(values: RoomFormValues): CreateRoomInput {
  return createRoomSchema.parse({
    number: values.number,
    type: values.type,
    pricePerNight: values.pricePerNight,
    capacity: values.capacity,
    facilities: normalizeFacilitiesInput(values.facilities),
    description: values.description,
  });
}

export function buildUpdateRoomPayload(values: RoomFormValues): UpdateRoomInput {
  return updateRoomSchema.parse({
    number: values.number,
    type: values.type,
    pricePerNight: values.pricePerNight,
    capacity: values.capacity,
    facilities: normalizeFacilitiesInput(values.facilities),
    description: values.description,
    isActive: values.isActive,
  });
}
