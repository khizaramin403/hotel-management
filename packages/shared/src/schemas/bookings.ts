import { z } from "zod";
import {
  bookingStatusSchema,
  dateStringSchema,
  emailSchema,
  idSchema,
  MAX_PAGE_LIMIT,
  validateStayDates,
} from "./common";

export const MAX_GUESTS = 8;

export const createBookingSchema = z
  .object({
    roomId: idSchema,
    checkIn: dateStringSchema,
    checkOut: dateStringSchema,
    guests: z.number().int().min(1).max(MAX_GUESTS),
  })
  .superRefine((data, ctx) => {
    validateStayDates(data.checkIn, data.checkOut, ctx);
  });

export const guestDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(60, "Full name must be at most 60 characters"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(25, "Phone number must be at most 25 characters")
    .regex(/^\+?[0-9()\-\s]+$/, "Enter a valid phone number")
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Enter a valid phone number"),
  email: emailSchema,
  specialRequests: z.string().trim().max(500, "Special requests must be at most 500 characters"),
});

const statusListSchema = z.preprocess((val) => {
  if (val === undefined || val === "") return undefined;
  if (typeof val === "string") {
    const parts = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  return val;
}, z.array(bookingStatusSchema).min(1).optional());

export const bookingsQuerySchema = z
  .object({
    status: statusListSchema,
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    q: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().trim().min(1).max(100).optional(),
    ),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(10),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.to < data.from) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "End date must be on or after start date",
      });
    }
  });

export const setStatusSchema = z.object({
  status: z.enum(["checked_in", "checked_out"]),
});

export const reportQuerySchema = z
  .object({
    from: dateStringSchema,
    to: dateStringSchema,
  })
  .refine((data) => data.to >= data.from, {
    path: ["to"],
    message: "End date must be on or after start date",
  });

export const paymentWebhookSchema = z.object({
  paymentId: idSchema,
  bookingId: idSchema,
  status: z.enum(["paid", "failed"]),
  providerRef: z.string().trim().min(1),
});

export const simulatePaymentSchema = z.object({
  status: z.enum(["paid", "failed"]),
});
