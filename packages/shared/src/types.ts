import { z } from "zod";
import {
  apiErrorSchema,
  availabilityQuerySchema,
  bookingPaymentSummarySchema,
  bookingSchema,
  bookingStatusSchema,
  bookingsQuerySchema,
  conversationLastMessageSchema,
  conversationSchema,
  conversationStatusSchema,
  createBookingSchema,
  createConversationSchema,
  createRoomSchema,
  createStaffSchema,
  cursorMetaSchema,
  errorCodeSchema,
  errorResponseSchema,
  idParamSchema,
  imageSchema,
  imageUrlsSchema,
  loginSchema,
  messageSchema,
  messagesQuerySchema,
  paginationMetaSchema,
  paymentSchema,
  paymentStatusSchema,
  paymentWebhookSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
  registerSchema,
  reportQuerySchema,
  responseEnvelopeSchema,
  roleSchema,
  roomDetailSchema,
  roomSchema,
  roomTypeSchema,
  roomsQuerySchema,
  saveImageSchema,
  sendMessageSchema,
  setStatusSchema,
  simulatePaymentSchema,
  staffQuerySchema,
  updateRoomSchema,
  uploadUrlSchema,
  userSchema,
  validationErrorDetailSchema,
} from "./schemas/index";

export type Role = z.infer<typeof roleSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export type User = z.infer<typeof userSchema>;
export type ImageUrls = z.infer<typeof imageUrlsSchema>;
export type Image = z.infer<typeof imageSchema>;
export type Room = z.infer<typeof roomSchema>;
export type RoomDetail = z.infer<typeof roomDetailSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type BookingPaymentSummary = z.infer<typeof bookingPaymentSummarySchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type ConversationLastMessage = z.infer<typeof conversationLastMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type CursorMeta = z.infer<typeof cursorMetaSchema>;
export type ValidationErrorDetail = z.infer<typeof validationErrorDetailSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ResponseEnvelope = z.infer<typeof responseEnvelopeSchema>;

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface CursorPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: CursorMeta;
}

export type IdParam = z.infer<typeof idParamSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type StaffQuery = z.infer<typeof staffQuerySchema>;

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomsQuery = z.infer<typeof roomsQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type SaveImageInput = z.infer<typeof saveImageSchema>;

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingsQuery = z.infer<typeof bookingsQuerySchema>;
export type SetStatusInput = z.infer<typeof setStatusSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;
