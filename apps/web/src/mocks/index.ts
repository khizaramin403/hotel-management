import type { AxiosInstance } from "axios";
import MockAdapter from "axios-mock-adapter";
import { getMockLatencyMs } from "./db";
import { registerAuthHandlers } from "./handlers/auth";
import { registerBookingHandlers } from "./handlers/bookings";
import { registerChatHandlers } from "./handlers/chat";
import { registerRoomHandlers } from "./handlers/rooms";

export type MockModuleName = "auth" | "rooms" | "bookings" | "chat";

const VALID_MOCK_MODULES = new Set<MockModuleName>(["auth", "rooms", "bookings", "chat"]);

let activeMockAdapter: MockAdapter | null = null;
let mockedClient: AxiosInstance | null = null;

export function parseMockModules(raw: string | undefined): Set<MockModuleName> {
  if (!raw) {
    return new Set();
  }

  const modules = new Set<MockModuleName>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim().toLowerCase();
    if (VALID_MOCK_MODULES.has(trimmed as MockModuleName)) {
      modules.add(trimmed as MockModuleName);
    }
  }
  return modules;
}

/**
 * Attaches axios-mock-adapter to `client` when NEXT_PUBLIC_USE_MOCKS is "true",
 * registering handlers only for modules listed in NEXT_PUBLIC_MOCK_MODULES and
 * passing unmatched requests through to the real network.
 */
export function setupMocks(client: AxiosInstance): MockAdapter | null {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true") {
    return null;
  }

  if (activeMockAdapter && mockedClient === client) {
    return activeMockAdapter;
  }

  if (activeMockAdapter) {
    activeMockAdapter.restore();
    activeMockAdapter = null;
    mockedClient = null;
  }

  const modules = parseMockModules(process.env.NEXT_PUBLIC_MOCK_MODULES);
  const mock = new MockAdapter(client, {
    delayResponse: getMockLatencyMs(),
    onNoMatch: "passthrough",
  });

  if (modules.has("auth")) {
    registerAuthHandlers(mock);
  }
  if (modules.has("rooms")) {
    registerRoomHandlers(mock);
  }
  if (modules.has("bookings")) {
    registerBookingHandlers(mock);
  }
  if (modules.has("chat")) {
    registerChatHandlers(mock);
  }

  mock.onAny().passThrough();

  activeMockAdapter = mock;
  mockedClient = client;

  return mock;
}

export function teardownMocks(): void {
  if (activeMockAdapter) {
    activeMockAdapter.restore();
    activeMockAdapter = null;
    mockedClient = null;
  }
}
