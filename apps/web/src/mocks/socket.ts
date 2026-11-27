import { sendMessageSchema } from "@hotel/shared";
import type {
  ClientSocketEventName,
  ServerSocketEventName,
  ServerSocketHandler,
  SocketAckResponses,
  SocketClient,
  SocketClientToServerEvents,
  SocketServerToClientEvents,
} from "@/lib/socket/types";
import {
  appendMockChatMessage,
  findMockConversationById,
  getCurrentSessionUser,
  getMockUsers,
  markMockConversationRead,
} from "./db";

export const MOCK_STAFF_TYPING_DELAY_MS = 300;
export const MOCK_STAFF_REPLY_DELAY_MS = 1500;
export const MOCK_CALL_ANSWER_DELAY_MS = 2000;

export interface MockSocketOptions {
  replyDelayMs?: number;
  callAnswerDelayMs?: number;
}

type ListenerSetMap = {
  [E in ServerSocketEventName]?: Set<SocketServerToClientEvents[E]>;
};

function buildMockStaffReply(guestMessage: string): string {
  const normalized = guestMessage.trim().toLowerCase();
  if (normalized.includes("check-in") || normalized.includes("check in")) {
    return "Reception has noted your check-in request and will confirm availability on arrival.";
  }
  if (normalized.includes("breakfast")) {
    return "Breakfast is served daily from 7:00 AM to 10:30 AM in the dining room.";
  }
  return "Thanks for contacting Grand Hotel reception. A team member will assist you shortly.";
}

export class MockSocket implements SocketClient {
  private readonly listeners: ListenerSetMap = {};
  private readonly activeTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly pendingCallTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly replyDelayMs: number;
  private readonly callAnswerDelayMs: number;
  private connected = false;

  constructor(options: MockSocketOptions = {}) {
    this.replyDelayMs = options.replyDelayMs ?? MOCK_STAFF_REPLY_DELAY_MS;
    this.callAnswerDelayMs = options.callAnswerDelayMs ?? MOCK_CALL_ANSWER_DELAY_MS;
  }

  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.simulateServerEvent("connect");
  }

  disconnect(): void {
    this.clearTimers();
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.simulateServerEvent("disconnect", "io client disconnect");
  }

  isConnected(): boolean {
    return this.connected;
  }

  on<E extends ServerSocketEventName>(event: E, handler: ServerSocketHandler<E>): void {
    let bucket = this.listeners[event] as Set<ServerSocketHandler<E>> | undefined;
    if (!bucket) {
      bucket = new Set();
      this.listeners[event] = bucket as ListenerSetMap[E];
    }
    bucket.add(handler);
  }

  off<E extends ServerSocketEventName>(event: E, handler: ServerSocketHandler<E>): void {
    const bucket = this.listeners[event] as Set<ServerSocketHandler<E>> | undefined;
    bucket?.delete(handler);
  }

  simulateServerEvent<E extends ServerSocketEventName>(
    event: E,
    ...args: Parameters<SocketServerToClientEvents[E]>
  ): void {
    const bucket = this.listeners[event] as Set<ServerSocketHandler<E>> | undefined;
    if (!bucket || bucket.size === 0) {
      return;
    }

    for (const handler of Array.from(bucket)) {
      const invoke = handler as (...params: Parameters<SocketServerToClientEvents[E]>) => void;
      invoke(...args);
    }
  }

  async emit<E extends ClientSocketEventName>(
    event: E,
    payload: SocketClientToServerEvents[E],
  ): Promise<SocketAckResponses[E]> {
    if (!this.connected) {
      throw new Error("MockSocket is not connected");
    }

    switch (event) {
      case "message:send": {
        const message = this.handleMessageSend(
          payload as SocketClientToServerEvents["message:send"],
        );
        return message as SocketAckResponses[E];
      }
      case "typing:start": {
        const { conversationId } = payload as SocketClientToServerEvents["typing:start"];
        this.simulateServerEvent("typing", {
          conversationId,
          userId: this.resolveActorId(conversationId),
          isTyping: true,
        });
        break;
      }
      case "typing:stop": {
        const { conversationId } = payload as SocketClientToServerEvents["typing:stop"];
        this.simulateServerEvent("typing", {
          conversationId,
          userId: this.resolveActorId(conversationId),
          isTyping: false,
        });
        break;
      }
      case "conversation:read": {
        const { conversationId } = payload as SocketClientToServerEvents["conversation:read"];
        const updated = markMockConversationRead(conversationId);
        if (updated) {
          this.simulateServerEvent("conversation:updated", updated);
        }
        break;
      }
      case "call:offer": {
        const { conversationId } = payload as SocketClientToServerEvents["call:offer"];
        this.scheduleCallAnswer(conversationId);
        break;
      }
      case "call:answer": {
        const { conversationId, sdp } = payload as SocketClientToServerEvents["call:answer"];
        this.cancelPendingCallTimer(conversationId);
        this.simulateServerEvent("call:answered", { conversationId, sdp });
        break;
      }
      case "call:ice":
        break;
      case "call:reject": {
        const { conversationId } = payload as SocketClientToServerEvents["call:reject"];
        this.cancelPendingCallTimer(conversationId);
        this.simulateServerEvent("call:rejected", { conversationId });
        break;
      }
      case "call:end": {
        const { conversationId } = payload as SocketClientToServerEvents["call:end"];
        this.cancelPendingCallTimer(conversationId);
        this.simulateServerEvent("call:ended", { conversationId });
        break;
      }
    }

    return undefined as SocketAckResponses[E];
  }

  private resolveActorId(conversationId: number): number {
    const currentUser = getCurrentSessionUser();
    if (currentUser) {
      return currentUser.id;
    }
    return findMockConversationById(conversationId)?.guestId ?? 1;
  }

  private resolveStaffResponderId(conversationId: number): number {
    const conversation = findMockConversationById(conversationId);
    if (conversation?.staffId) {
      return conversation.staffId;
    }
    return getMockUsers().find((user) => user.role === "staff")?.id ?? 2;
  }

  private handleMessageSend(payload: SocketClientToServerEvents["message:send"]) {
    const parsed = sendMessageSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid message payload");
    }

    const conversation = findMockConversationById(parsed.data.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const sessionUser = getCurrentSessionUser();
    const senderId = sessionUser?.id ?? conversation.guestId;
    const senderRole = sessionUser?.role ?? "guest";

    const appended = appendMockChatMessage({
      conversationId: parsed.data.conversationId,
      senderId,
      senderRole,
      text: parsed.data.text,
      incrementUnread: false,
    });
    if (!appended) {
      throw new Error("Conversation not found");
    }

    this.simulateServerEvent("message:new", appended.message);
    this.simulateServerEvent("conversation:updated", appended.conversation);

    if (senderRole === "guest") {
      this.scheduleStaffAutoReply(parsed.data.conversationId, parsed.data.text);
    }

    return appended.message;
  }

  private scheduleStaffAutoReply(conversationId: number, guestText: string): void {
    const staffId = this.resolveStaffResponderId(conversationId);
    const typingDelay = Math.min(MOCK_STAFF_TYPING_DELAY_MS, this.replyDelayMs);

    if (typingDelay > 0) {
      this.scheduleTimer(() => {
        if (!this.connected) {
          return;
        }
        this.simulateServerEvent("typing", {
          conversationId,
          userId: staffId,
          isTyping: true,
        });
      }, typingDelay);
    }

    this.scheduleTimer(() => {
      if (!this.connected) {
        return;
      }

      this.simulateServerEvent("typing", {
        conversationId,
        userId: staffId,
        isTyping: false,
      });

      const reply = appendMockChatMessage({
        conversationId,
        senderId: staffId,
        senderRole: "staff",
        text: buildMockStaffReply(guestText),
        incrementUnread: true,
      });
      if (!reply) {
        return;
      }

      this.simulateServerEvent("message:new", reply.message);
      this.simulateServerEvent("conversation:updated", reply.conversation);
    }, this.replyDelayMs);
  }

  private scheduleCallAnswer(conversationId: number): void {
    this.cancelPendingCallTimer(conversationId);

    const timer = this.scheduleTimer(() => {
      this.pendingCallTimers.delete(conversationId);
      if (!this.connected) {
        return;
      }
      this.simulateServerEvent("call:answered", {
        conversationId,
        sdp: {
          type: "answer",
          sdp: `v=0\r\no=- ${conversationId} 2 IN IP4 127.0.0.1\r\ns=Grand Hotel Mock Audio\r\n`,
        },
      });
    }, this.callAnswerDelayMs);

    this.pendingCallTimers.set(conversationId, timer);
  }

  private scheduleTimer(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.activeTimers.delete(timer);
      callback();
    }, delayMs);
    this.activeTimers.add(timer);
    return timer;
  }

  private cancelPendingCallTimer(conversationId: number): void {
    const existing = this.pendingCallTimers.get(conversationId);
    if (!existing) {
      return;
    }
    clearTimeout(existing);
    this.activeTimers.delete(existing);
    this.pendingCallTimers.delete(conversationId);
  }

  private clearTimers(): void {
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
    this.pendingCallTimers.clear();
  }
}
