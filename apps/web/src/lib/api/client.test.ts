import type { Room, User } from "@hotel/shared";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  ApiClientError,
  configureApiAuthHandlers,
  getMe,
  listRooms,
  login,
  queryKeys,
} from "./index";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAMPLE_USER: User = {
  id: 7,
  name: "Sara Khan",
  email: "guest@example.com",
  role: "guest",
};

const SAMPLE_ROOM: Room = {
  id: 12,
  number: "204",
  type: "Deluxe",
  pricePerNight: 15000,
  capacity: 2,
  facilities: ["Wi-Fi", "AC"],
  description: "Quiet deluxe room.",
  isActive: true,
  coverImage: null,
};

describe("apiClient and endpoint wrappers", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    configureApiAuthHandlers({});
  });

  afterEach(() => {
    mock.restore();
    configureApiAuthHandlers({});
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("configures baseURL, credentials, timeout, x-request-id header, and handles a normal call", async () => {
    expect(apiClient.defaults.baseURL).toBe("/api/v1");
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.timeout).toBe(15_000);

    mock.onGet("/rooms").reply((config) => {
      const reqId = config.headers?.["x-request-id"];
      expect(typeof reqId).toBe("string");
      expect(String(reqId)).toMatch(UUID_REGEX);

      return [
        200,
        {
          success: true,
          data: [SAMPLE_ROOM],
          meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
        },
      ];
    });

    const result = await listRooms({ page: 1, limit: 12 });
    expect(result.data).toEqual([SAMPLE_ROOM]);
    expect(result.meta.total).toBe(1);
    expect(queryKeys.rooms.list({ page: 1, limit: 12 })).toEqual([
      "rooms",
      "list",
      { page: 1, limit: 12 },
    ]);
  });

  it("normalizes 422 validation responses with details and response requestId", async () => {
    mock.onPost("/auth/login").reply(
      422,
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: [{ field: "email", message: "Invalid email address" }],
        },
      },
      { "x-request-id": "req-422-abc" },
    );

    await expect(login({ email: "bad", password: "x" })).rejects.toMatchObject({
      name: "ApiClientError",
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid input",
      details: [{ field: "email", message: "Invalid email address" }],
      requestId: "req-422-abc",
    });
  });

  it("calls POST /auth/refresh once for parallel 401 TOKEN_EXPIRED failures and retries requests", async () => {
    let meAttempts = 0;
    let roomsAttempts = 0;
    let refreshCalls = 0;

    mock.onGet("/auth/me").reply(() => {
      meAttempts += 1;
      if (meAttempts === 1) {
        return [
          401,
          { success: false, error: { code: "TOKEN_EXPIRED", message: "Access token expired" } },
        ];
      }
      return [200, { success: true, data: { user: SAMPLE_USER } }];
    });

    mock.onGet("/rooms").reply(() => {
      roomsAttempts += 1;
      if (roomsAttempts === 1) {
        return [
          401,
          { success: false, error: { code: "TOKEN_EXPIRED", message: "Access token expired" } },
        ];
      }
      return [
        200,
        {
          success: true,
          data: [SAMPLE_ROOM],
          meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
        },
      ];
    });

    mock.onPost("/auth/refresh").reply(() => {
      refreshCalls += 1;
      return [200, { success: true, data: { user: SAMPLE_USER } }];
    });

    const [user, rooms] = await Promise.all([getMe(), listRooms()]);
    expect(user).toEqual(SAMPLE_USER);
    expect(rooms.data).toEqual([SAMPLE_ROOM]);
    expect(refreshCalls).toBe(1);
    expect(meAttempts).toBe(2);
    expect(roomsAttempts).toBe(2);
  });

  it("clears auth state and redirects to /login?next=<current path> when refresh fails", async () => {
    const onUnauthorized = vi.fn();
    const redirectToLogin = vi.fn();

    window.history.pushState({}, "", "/my-bookings?tab=upcoming");
    configureApiAuthHandlers({ onUnauthorized, redirectToLogin });

    mock.onGet("/auth/me").reply(401, {
      success: false,
      error: { code: "TOKEN_EXPIRED", message: "Access token expired" },
    });
    mock.onPost("/auth/refresh").reply(401, {
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Refresh token expired" },
    });

    await expect(getMe()).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledWith("/login?next=%2Fmy-bookings%3Ftab%3Dupcoming");
  });

  it("normalizes network failures to NETWORK_ERROR", async () => {
    mock.onGet("/rooms").networkError();

    await expect(listRooms()).rejects.toMatchObject({
      name: "ApiClientError",
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("warns on Zod response mismatch in development and skips parsing in production", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mock.onGet("/auth/me").reply(200, {
      success: true,
      data: { user: { id: "not-an-int", name: "Broken", email: "bad", role: "guest" } },
    });

    vi.stubEnv("NODE_ENV", "development");
    await getMe();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockClear();
    vi.stubEnv("NODE_ENV", "production");
    await getMe();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
