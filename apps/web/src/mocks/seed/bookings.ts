import {
  calcTotals,
  nightsBetween,
  type Booking,
  type BookingStatus,
  type Payment,
  type PaymentStatus,
  type RoomDetail,
  type User,
} from "@hotel/shared";

const MS_PER_DAY = 86_400_000;

export function getTodayCalendarDateUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDaysCalendarDate(baseDateStr: string, offsetDays: number): string {
  const [year, month, day] = baseDateStr.split("-").map(Number);
  const utcMs = Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1) + offsetDays * MS_PER_DAY;
  return new Date(utcMs).toISOString().slice(0, 10);
}

interface SeedBookingSpec {
  id: number;
  userId: number;
  roomId: number;
  checkInOffset: number;
  checkOutOffset: number;
  guests: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus | null;
  createdOffsetDays: number;
}

const SEED_BOOKING_SPECS: readonly SeedBookingSpec[] = [
  // Past (checked_out)
  {
    id: 1031,
    userId: 1,
    roomId: 1,
    checkInOffset: -12,
    checkOutOffset: -10,
    guests: 1,
    status: "checked_out",
    paymentStatus: "paid",
    createdOffsetDays: -16,
  },
  {
    id: 1032,
    userId: 1,
    roomId: 3,
    checkInOffset: -8,
    checkOutOffset: -5,
    guests: 2,
    status: "checked_out",
    paymentStatus: "paid",
    createdOffsetDays: -12,
  },
  {
    id: 1033,
    userId: 4,
    roomId: 5,
    checkInOffset: -7,
    checkOutOffset: -4,
    guests: 2,
    status: "checked_out",
    paymentStatus: "paid",
    createdOffsetDays: -11,
  },
  {
    id: 1034,
    userId: 4,
    roomId: 9,
    checkInOffset: -4,
    checkOutOffset: -2,
    guests: 2,
    status: "checked_out",
    paymentStatus: "paid",
    createdOffsetDays: -9,
  },
  // Cancelled
  {
    id: 1035,
    userId: 1,
    roomId: 2,
    checkInOffset: -3,
    checkOutOffset: -1,
    guests: 1,
    status: "cancelled",
    paymentStatus: "refunded",
    createdOffsetDays: -8,
  },
  {
    id: 1036,
    userId: 1,
    roomId: 5,
    checkInOffset: 2,
    checkOutOffset: 4,
    guests: 2,
    status: "cancelled",
    paymentStatus: "refunded",
    createdOffsetDays: -5,
  },
  {
    id: 1037,
    userId: 4,
    roomId: 7,
    checkInOffset: 4,
    checkOutOffset: 6,
    guests: 2,
    status: "cancelled",
    paymentStatus: "failed",
    createdOffsetDays: -4,
  },
  // Checked in
  {
    id: 1038,
    userId: 1,
    roomId: 4,
    checkInOffset: -1,
    checkOutOffset: 2,
    guests: 2,
    status: "checked_in",
    paymentStatus: "paid",
    createdOffsetDays: -6,
  },
  {
    id: 1039,
    userId: 4,
    roomId: 8,
    checkInOffset: 0,
    checkOutOffset: 3,
    guests: 3,
    status: "checked_in",
    paymentStatus: "paid",
    createdOffsetDays: -3,
  },
  // Confirmed (upcoming & today)
  {
    id: 1040,
    userId: 1,
    roomId: 11,
    checkInOffset: 0,
    checkOutOffset: 2,
    guests: 4,
    status: "confirmed",
    paymentStatus: "paid",
    createdOffsetDays: -2,
  },
  {
    id: 1041,
    userId: 1,
    roomId: 7,
    checkInOffset: 1,
    checkOutOffset: 4,
    guests: 2,
    status: "confirmed",
    paymentStatus: "paid",
    createdOffsetDays: -2,
  },
  {
    id: 1042,
    userId: 4,
    roomId: 10,
    checkInOffset: 3,
    checkOutOffset: 6,
    guests: 3,
    status: "confirmed",
    paymentStatus: "paid",
    createdOffsetDays: -1,
  },
  // Pending (upcoming)
  {
    id: 1043,
    userId: 1,
    roomId: 12,
    checkInOffset: 5,
    checkOutOffset: 8,
    guests: 5,
    status: "pending",
    paymentStatus: "pending",
    createdOffsetDays: 0,
  },
  {
    id: 1044,
    userId: 1,
    roomId: 9,
    checkInOffset: 9,
    checkOutOffset: 11,
    guests: 2,
    status: "pending",
    paymentStatus: null,
    createdOffsetDays: 0,
  },
];

export interface SeedBookingsBundle {
  bookings: Booking[];
  payments: Payment[];
  nextBookingId: number;
  nextPaymentId: number;
}

export function createSeedBookings(
  users: readonly User[],
  rooms: readonly RoomDetail[],
  now: Date = new Date(),
): SeedBookingsBundle {
  const today = getTodayCalendarDateUtc(now);
  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  let nextPaymentId = 501;

  for (const spec of SEED_BOOKING_SPECS) {
    const user = users.find((u) => u.id === spec.userId);
    const room = rooms.find((r) => r.id === spec.roomId);
    if (!user || !room) {
      continue;
    }

    const checkIn = addDaysCalendarDate(today, spec.checkInOffset);
    const checkOut = addDaysCalendarDate(today, spec.checkOutOffset);
    const nights = nightsBetween(checkIn, checkOut);
    const { subtotal, taxAmount, totalPrice } = calcTotals(nights, room.pricePerNight);

    const createdAt = new Date(now.getTime() + spec.createdOffsetDays * MS_PER_DAY).toISOString();
    const expiresAt =
      spec.status === "pending" ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;

    let paymentSummary: Booking["payment"] = null;
    if (spec.paymentStatus !== null) {
      const payment: Payment = {
        id: nextPaymentId,
        bookingId: spec.id,
        amount: totalPrice,
        status: spec.paymentStatus,
        providerRef: spec.paymentStatus === "pending" ? null : `seed_ref_${nextPaymentId}`,
      };
      payments.push(payment);
      paymentSummary = { id: payment.id, status: payment.status };
      nextPaymentId += 1;
    }

    bookings.push({
      id: spec.id,
      userId: user.id,
      guestName: user.name,
      roomId: room.id,
      roomNumber: room.number,
      roomType: room.type,
      checkIn,
      checkOut,
      guests: spec.guests,
      nights,
      subtotal,
      taxAmount,
      totalPrice,
      status: spec.status,
      expiresAt,
      createdAt,
      payment: paymentSummary,
    });
  }

  return {
    bookings,
    payments,
    nextBookingId: 1045,
    nextPaymentId,
  };
}
