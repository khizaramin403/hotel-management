import { parseMockModules } from "@/mocks";
import { MockSocket } from "@/mocks/socket";
import { RealSocket } from "./realSocket";
import type { SocketClient } from "./types";

const DEFAULT_SOCKET_URL = "http://localhost:8080";

export function isChatMockEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" &&
    parseMockModules(process.env.NEXT_PUBLIC_MOCK_MODULES).has("chat")
  );
}

export function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_SOCKET_URL;
}

export function createSocketClient(): SocketClient {
  if (isChatMockEnabled()) {
    return new MockSocket();
  }
  return new RealSocket(getSocketUrl());
}

export { RealSocket } from "./realSocket";
export { upsertConversationInCache, upsertMessageInCache } from "./chatCache";
export type {
  CallAnsweredPayload,
  CallIcePayload,
  CallIncomingPayload,
  CallStatePayload,
  ClientSocketEventName,
  ServerSocketEventName,
  ServerSocketHandler,
  SocketAckResponses,
  SocketClient,
  SocketClientToServerEvents,
  SocketServerCustomEvents,
  SocketServerToClientEvents,
  TypingEventPayload,
} from "./types";
