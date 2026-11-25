import { z } from "zod";
import {
  dateStringSchema,
  MAX_PAGE_LIMIT,
  queryBooleanSchema,
  roomTypeSchema,
  validateStayDates,
} from "./common";

export const createRoomSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Room number is required")
    .max(20, "Room number must be at most 20 characters"),
  type: roomTypeSchema,
  pricePerNight: z.number().int().positive("Price per night must be a positive integer"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  facilities: z.array(z.string().trim().min(1)),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be at most 2000 characters"),
});

export const updateRoomSchema = createRoomSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const roomsQuerySchema = z
  .object({
    type: roomTypeSchema.optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    guests: z.coerce.number().int().min(1).max(8).optional(),
    checkIn: dateStringSchema.optional(),
    checkOut: dateStringSchema.optional(),
    sort: z.enum(["price_asc", "price_desc", "number"]).optional(),
    includeInactive: queryBooleanSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(12),
  })
  .superRefine((data, ctx) => {
    if ((data.checkIn && !data.checkOut) || (!data.checkIn && data.checkOut)) {
      ctx.addIssue({
        code: "custom",
        path: [data.checkIn ? "checkOut" : "checkIn"],
        message: "Both checkIn and checkOut must be provided together",
      });
    } else if (data.checkIn && data.checkOut) {
      validateStayDates(data.checkIn, data.checkOut, ctx);
    }

    if (
      data.minPrice !== undefined &&
      data.maxPrice !== undefined &&
      data.maxPrice < data.minPrice
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "maxPrice must be greater than or equal to minPrice",
      });
    }
  });

export const availabilityQuerySchema = z
  .object({
    checkIn: dateStringSchema,
    checkOut: dateStringSchema,
  })
  .superRefine((data, ctx) => {
    validateStayDates(data.checkIn, data.checkOut, ctx);
  });

export const uploadUrlSchema = z.object({
  fileType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const saveImageSchema = z.object({
  key: z.string().trim().min(1, "Image key is required"),
  isCover: z.boolean(),
});
