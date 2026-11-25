import {
  bookingSchema,
  dateStringSchema,
  idSchema,
  nonNegativeIntSchema,
  paginatedResponseSchema,
  paymentStatusSchema,
  successResponseSchema,
  type Booking,
  type CreateBookingInput,
  type PaginationMeta,
  type ReportQuery,
  type SetStatusInput,
  type SimulatePaymentInput,
} from "@hotel/shared";
import { z } from "zod";
import { apiClient } from "../client";
import { parseApiResponse } from "../parseResponse";
import type { BookingsListKeyParams } from "../queryKeys";

const bookingEnvelopeSchema = successResponseSchema(bookingSchema);
const bookingsListEnvelopeSchema = paginatedResponseSchema(bookingSchema);

const startPaymentSchema = z.object({
  paymentId: idSchema,
  amount: nonNegativeIntSchema,
  status: paymentStatusSchema,
});
const startPaymentEnvelopeSchema = successResponseSchema(startPaymentSchema);

const salesReportDailyItemSchema = z.object({
  date: dateStringSchema,
  revenue: nonNegativeIntSchema,
  bookings: nonNegativeIntSchema,
});
const salesReportSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  totalRevenue: nonNegativeIntSchema,
  bookingCount: nonNegativeIntSchema,
  daily: z.array(salesReportDailyItemSchema),
});
const salesReportEnvelopeSchema = successResponseSchema(salesReportSchema);

const occupancyReportDailyItemSchema = z.object({
  date: dateStringSchema,
  occupiedRooms: nonNegativeIntSchema,
  rate: z.number(),
});
const occupancyReportSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  occupancyRate: z.number(),
  roomNights: nonNegativeIntSchema,
  availableRoomNights: nonNegativeIntSchema,
  daily: z.array(occupancyReportDailyItemSchema),
});
const occupancyReportEnvelopeSchema = successResponseSchema(occupancyReportSchema);

const simulatePaymentEnvelopeSchema = successResponseSchema(
  z.object({
    received: z.boolean(),
  }),
);

export type StartBookingPaymentResult = z.infer<typeof startPaymentSchema>;
export type SalesReport = z.infer<typeof salesReportSchema>;
export type OccupancyReport = z.infer<typeof occupancyReportSchema>;

export interface BookingsListResult {
  data: Booking[];
  meta: PaginationMeta;
}

function serializeBookingsParams(params?: BookingsListKeyParams) {
  if (!params) {
    return undefined;
  }

  return {
    ...params,
    status: Array.isArray(params.status) ? params.status.join(",") : params.status,
  };
}

export async function createBooking(
  input: CreateBookingInput,
  idempotencyKey: string,
): Promise<Booking> {
  const response = await apiClient.post("/bookings", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  const parsed = parseApiResponse(bookingEnvelopeSchema, response.data, "POST /bookings");
  return parsed.data;
}

export async function listMyBookings(params?: BookingsListKeyParams): Promise<BookingsListResult> {
  const response = await apiClient.get("/bookings/my", {
    params: serializeBookingsParams(params),
  });
  const parsed = parseApiResponse(bookingsListEnvelopeSchema, response.data, "GET /bookings/my");
  return { data: parsed.data, meta: parsed.meta };
}

export async function getBooking(id: number): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${id}`);
  const parsed = parseApiResponse(bookingEnvelopeSchema, response.data, `GET /bookings/${id}`);
  return parsed.data;
}

export async function cancelBooking(id: number): Promise<Booking> {
  const response = await apiClient.patch(`/bookings/${id}/cancel`);
  const parsed = parseApiResponse(
    bookingEnvelopeSchema,
    response.data,
    `PATCH /bookings/${id}/cancel`,
  );
  return parsed.data;
}

export async function startBookingPayment(id: number): Promise<StartBookingPaymentResult> {
  const response = await apiClient.post(`/bookings/${id}/pay`);
  const parsed = parseApiResponse(
    startPaymentEnvelopeSchema,
    response.data,
    `POST /bookings/${id}/pay`,
  );
  return parsed.data;
}

export async function listBookings(params?: BookingsListKeyParams): Promise<BookingsListResult> {
  const response = await apiClient.get("/bookings", {
    params: serializeBookingsParams(params),
  });
  const parsed = parseApiResponse(bookingsListEnvelopeSchema, response.data, "GET /bookings");
  return { data: parsed.data, meta: parsed.meta };
}

export async function updateBookingStatus(id: number, input: SetStatusInput): Promise<Booking> {
  const response = await apiClient.patch(`/bookings/${id}/status`, input);
  const parsed = parseApiResponse(
    bookingEnvelopeSchema,
    response.data,
    `PATCH /bookings/${id}/status`,
  );
  return parsed.data;
}

export async function getSalesReport(params: ReportQuery): Promise<SalesReport> {
  const response = await apiClient.get("/bookings/reports/sales", { params });
  const parsed = parseApiResponse(
    salesReportEnvelopeSchema,
    response.data,
    "GET /bookings/reports/sales",
  );
  return parsed.data;
}

export async function getOccupancyReport(params: ReportQuery): Promise<OccupancyReport> {
  const response = await apiClient.get("/bookings/reports/occupancy", { params });
  const parsed = parseApiResponse(
    occupancyReportEnvelopeSchema,
    response.data,
    "GET /bookings/reports/occupancy",
  );
  return parsed.data;
}

export async function simulatePayment(
  paymentId: number,
  input: SimulatePaymentInput,
): Promise<{ received: boolean }> {
  const response = await apiClient.post(`/bookings/dev/payments/${paymentId}/simulate`, input);
  const parsed = parseApiResponse(
    simulatePaymentEnvelopeSchema,
    response.data,
    `POST /bookings/dev/payments/${paymentId}/simulate`,
  );
  return parsed.data;
}
