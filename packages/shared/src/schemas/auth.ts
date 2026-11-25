import { z } from "zod";
import { emailSchema, MAX_PAGE_LIMIT } from "./common";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name must be at most 60 characters");

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const createStaffSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
});

export const staffQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(10),
});
