import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConversation,
  getIceServers,
  listConversationMessages,
  listConversations,
  login,
  register,
} from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { resetMockDb } from "../db";
import { teardownMocks } from "../index";

describe("mock chat handlers and seed data", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,chat");
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
  });

  it("seeds 3 open conversations with unread counts and 150 cursor-paginated messages", async () => {
    await login({ email: "staff@example.com", password: "Passw0rd!123" });

    const list = await listConversations();
    expect(list.data).toHaveLength(3);
    expect(list.data.some((conversation) => conversation.unreadCount > 0)).toBe(true);
    expect(list.data.some((conversation) => conversation.unreadCount === 0)).toBe(true);

    const collectedIds: number[] = [];
    let cursor: number | undefined;

    for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
      const page = await listConversationMessages(1, { cursor, limit: 30 });
      expect(page.data).toHaveLength(30);

      for (const msg of page.data) {
        collectedIds.push(msg.id);
      }

      if (pageIndex < 4) {
        expect(page.meta.nextCursor).toBe(page.data[page.data.length - 1]?.id);
        cursor = page.meta.nextCursor ?? undefined;
      } else {
        expect(page.meta.nextCursor).toBeNull();
      }
    }

    expect(collectedIds).toHaveLength(150);
    expect(new Set(collectedIds).size).toBe(150);
    // Newest first ordering (150 down to 1)
    expect(collectedIds[0]).toBe(150);
    expect(collectedIds[149]).toBe(1);
  });

  it("enforces role filtering, ownership checks, and conversation creation rules", async () => {
    await expect(listConversations()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });

    await login({ email: "staff@example.com", password: "Passw0rd!123" });
    await expect(createConversation()).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    await login({ email: "guest@example.com", password: "Passw0rd!123" });
    const guestList = await listConversations();
    expect(guestList.data).toHaveLength(1);
    expect(guestList.data[0]?.id).toBe(1);

    // Existing open conversation is returned rather than creating a duplicate
    const existing = await createConversation();
    expect(existing.id).toBe(1);

    // Ownership protection: guest 1 cannot read conversation 2 (guest 4)
    await expect(listConversationMessages(2)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    // Newly registered guest gets a brand new open conversation
    await register({
      name: "Bilal Tariq",
      email: "bilal@example.com",
      password: "Password123",
    });
    await login({ email: "bilal@example.com", password: "Password123" });

    const created = await createConversation();
    expect(created.id).toBe(4);
    expect(created.status).toBe("open");
    expect(created.unreadCount).toBe(0);
    expect(created.lastMessage).toBeNull();

    const iceServers = await getIceServers();
    expect(iceServers.length).toBeGreaterThan(0);
  });
});
