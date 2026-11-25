import type {
  AvailabilityQuery,
  BookingStatus,
  MessagesQuery,
  ReportQuery,
  RoomsQuery,
  StaffQuery,
} from "@hotel/shared";

export interface BookingsListKeyParams {
  status?: BookingStatus | readonly BookingStatus[];
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },
  staff: {
    all: ["staff"] as const,
    lists: () => ["staff", "list"] as const,
    list: (params?: Partial<StaffQuery>) => ["staff", "list", params ?? {}] as const,
  },
  rooms: {
    all: ["rooms"] as const,
    lists: () => ["rooms", "list"] as const,
    list: (params?: Partial<RoomsQuery>) => ["rooms", "list", params ?? {}] as const,
    details: () => ["rooms", "detail"] as const,
    detail: (id: number) => ["rooms", "detail", id] as const,
    availability: (id: number, params: AvailabilityQuery) =>
      ["rooms", "availability", id, params] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    myLists: () => ["bookings", "my"] as const,
    my: (params?: BookingsListKeyParams) => ["bookings", "my", params ?? {}] as const,
    lists: () => ["bookings", "list"] as const,
    list: (params?: BookingsListKeyParams) => ["bookings", "list", params ?? {}] as const,
    details: () => ["bookings", "detail"] as const,
    detail: (id: number) => ["bookings", "detail", id] as const,
  },
  reports: {
    all: ["reports"] as const,
    sales: (params: ReportQuery) => ["reports", "sales", params] as const,
    occupancy: (params: ReportQuery) => ["reports", "occupancy", params] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: (params?: { page?: number; limit?: number }) =>
      ["chat", "conversations", params ?? {}] as const,
    messages: (id: number, params?: Partial<MessagesQuery>) =>
      ["chat", "messages", id, params ?? {}] as const,
  },
};
