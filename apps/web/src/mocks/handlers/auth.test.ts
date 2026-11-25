import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  ApiClientError,
  createStaff,
  deleteStaff,
  getMe,
  listStaff,
  login,
  logout,
  refreshSession,
  register,
} from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { getMockLatencyMs, readMockRoleCookie, resetMockDb, setMockRoleCookie } from "../db";
import { setupMocks, teardownMocks } from "../index";

describe("mock infrastructure and auth handlers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not attach mocks when NEXT_PUBLIC_USE_MOCKS is false and defaults latency to 400 ms", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    expect(setupMocks(apiClient)).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "");
    expect(getMockLatencyMs()).toBe(400);
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "250");
    expect(getMockLatencyMs()).toBe(250);
  });

  it("dynamically loads mocks before the first request and passes unmocked modules through", async () => {
    const adapterCalls: string[] = [];
    const customClient = axios.create({
      baseURL: "/api/v1",
      adapter: async (config) => {
        adapterCalls.push(config.url ?? "");
        return {
          data: { success: true, data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    setupMocks(customClient);

    // /rooms is not in NEXT_PUBLIC_MOCK_MODULES="auth", so it must pass through to the underlying adapter.
    await customClient.get("/rooms");
    expect(adapterCalls).toEqual(["/rooms"]);

    // apiClient loads mocks dynamically on first request via ensureMocksInitialized().
    await expect(getMe()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("registers a new guest user, rejects duplicate email with 409, and returns 422 with details", async () => {
    const created = await register({
      name: "Nadia Tariq",
      email: "nadia@example.com",
      password: "Password123",
    });

    expect(created).toMatchObject({
      name: "Nadia Tariq",
      email: "nadia@example.com",
      role: "guest",
    });
    expect("password" in created).toBe(false);

    await expect(
      register({
        name: "Nadia Duplicate",
        email: "NADIA@example.com",
        password: "Password123",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_TAKEN",
    });

    await expect(
      register({
        name: "A",
        email: "bad-email",
        password: "short",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "password" }),
      ]),
    });
  });

  it("logs in seed users, sets mock_role cookie, supports me/refresh/logout, and handles 401/422", async () => {
    await expect(getMe()).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    await expect(refreshSession()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    await expect(logout()).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });

    await expect(
      login({ email: "guest@example.com", password: "wrong-password" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Email or password is incorrect",
    });

    await expect(login({ email: "invalid", password: "" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "password" }),
      ]),
    });

    const user = await login({ email: "guest@example.com", password: "Passw0rd!123" });
    expect(user).toMatchObject({ email: "guest@example.com", role: "guest" });
    expect(readMockRoleCookie()).toBe("guest");

    expect(await getMe()).toEqual(user);
    expect(await refreshSession()).toEqual(user);

    await logout();
    expect(readMockRoleCookie()).toBeNull();
    await expect(getMe()).rejects.toBeInstanceOf(ApiClientError);
  });

  it("restores session from mock_role cookie if in-memory session is reset", async () => {
    setMockRoleCookie("staff");
    const me = await getMe();
    expect(me).toMatchObject({ email: "staff@example.com", role: "staff" });
  });

  it("enforces admin role rules on staff list, create, and delete", async () => {
    // Logged out -> 401
    await expect(listStaff()).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    await expect(
      createStaff({ name: "New Staff", email: "newstaff@example.com", password: "Password123" }),
    ).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    await expect(deleteStaff(2)).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });

    // Non-admin (guest and staff) -> 403
    await login({ email: "guest@example.com", password: "Passw0rd!123" });
    await expect(listStaff()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(
      createStaff({ name: "New Staff", email: "newstaff@example.com", password: "Password123" }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(deleteStaff(2)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    await login({ email: "staff@example.com", password: "Passw0rd!123" });
    await expect(listStaff()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    // Admin -> 200 / 201 / 204 + 409 / 422 / 404
    await login({ email: "admin@example.com", password: "Passw0rd!123" });
    const initialList = await listStaff({ page: 1, limit: 10 });
    expect(initialList.data).toHaveLength(1);
    expect(initialList.data[0]).toMatchObject({ email: "staff@example.com", role: "staff" });
    expect(initialList.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });

    const createdStaff = await createStaff({
      name: "Bilal Ahmed",
      email: "bilal@example.com",
      password: "Password123",
    });
    expect(createdStaff).toMatchObject({ email: "bilal@example.com", role: "staff" });

    await expect(
      createStaff({
        name: "Duplicate",
        email: "bilal@example.com",
        password: "Password123",
      }),
    ).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });

    await expect(createStaff({ name: "B", email: "bad", password: "123" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });

    const afterCreate = await listStaff({ page: 1, limit: 10 });
    expect(afterCreate.data).toHaveLength(2);

    await deleteStaff(createdStaff.id);
    const afterDelete = await listStaff({ page: 1, limit: 10 });
    expect(afterDelete.data).toHaveLength(1);

    await expect(deleteStaff(9999)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
