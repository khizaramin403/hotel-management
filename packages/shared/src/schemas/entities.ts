import { z } from "zod";
import {
  bookingStatusSchema,
  conversationStatusSchema,
  dateStringSchema,
  emailSchema,
  idSchema,
  isoTimestampSchema,
  nonNegativeIntSchema,
  paymentStatusSchema,
  positiveIntSchema,
  roleSchema,
  roomTypeSchema,
} from "./common";

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: emailSchema,
  role: roleSchema,
  createdAt: isoTimestampSchema.optional(),
});

export const imageUrlsSchema = z.object({
  sm: z.string().min(1),
  md: z.string().min(1),
  lg: z.string().min(1),
});

export const imageSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  isCover: z.boolean(),
  sortOrder: nonNegativeIntSchema,
  urls: imageUrlsSchema,
});

export const roomSchema = z.object({
  id: idSchema,
  number: z.string().min(1),
  type: roomTypeSchema,
  pricePerNight: nonNegativeIntSchema,
  capacity: positiveIntSchema,
  facilities: z.array(z.string()),
  description: z.string(),
  isActive: z.boolean(),
  coverImage: imageSchema.nullable(),
});

export const roomDetailSchema = roomSchema.extend({
  images: z.array(imageSchema),
});

export const paymentSchema = z.object({
  id: idSchema,
  bookingId: idSchema,
  amount: nonNegativeIntSchema,
  status: paymentStatusSchema,
  providerRef: z.string().nullable(),
});

export const bookingPaymentSummarySchema = z.object({
  id: idSchema,
  status: paymentStatusSchema,
});

export const bookingSchema = z.object({
  id: idSchema,
  userId: idSchema,
  guestName: z.string(),
  roomId: idSchema,
  roomNumber: z.string(),
  roomType: roomTypeSchema,
  checkIn: dateStringSchema,
  checkOut: dateStringSchema,
  guests: positiveIntSchema,
  nights: positiveIntSchema,
  subtotal: nonNegativeIntSchema,
  taxAmount: nonNegativeIntSchema,
  totalPrice: nonNegativeIntSchema,
  status: bookingStatusSchema,
  expiresAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  payment: bookingPaymentSummarySchema.nullable(),
});

export const conversationLastMessageSchema = z.object({
  text: z.string(),
  createdAt: isoTimestampSchema,
});

export const conversationSchema = z.object({
  id: idSchema,
  guestId: idSchema,
  guestName: z.string(),
  staffId: idSchema.nullable(),
  status: conversationStatusSchema,
  lastMessage: conversationLastMessageSchema.nullable(),
  unreadCount: nonNegativeIntSchema,
});

export const messageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  senderId: idSchema,
  senderRole: roleSchema,
  text: z.string(),
  createdAt: isoTimestampSchema,
});
