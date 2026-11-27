import type { Conversation, Message } from "@hotel/shared";

export interface TypingEventPayload {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

export interface CallIncomingPayload {
  conversationId: number;
  fromUserId: number;
  sdp: unknown;
}

export interface CallAnsweredPayload {
  conversationId: number;
  sdp: unknown;
}

export interface CallIcePayload {
  conversationId: number;
  candidate: unknown;
}

export interface CallStatePayload {
  conversationId: number;
}

export interface SocketClientToServerEvents {
  "message:send": { conversationId: number; text: string };
  "typing:start": { conversationId: number };
  "typing:stop": { conversationId: number };
  "conversation:read": { conversationId: number };
  "call:offer": { conversationId: number; sdp: unknown };
  "call:answer": { conversationId: number; sdp: unknown };
  "call:ice": { conversationId: number; candidate: unknown };
  "call:reject": { conversationId: number };
  "call:end": { conversationId: number };
}

export interface SocketAckResponses {
  "message:send": Message;
  "typing:start": void;
  "typing:stop": void;
  "conversation:read": void;
  "call:offer": void;
  "call:answer": void;
  "call:ice": void;
  "call:reject": void;
  "call:end": void;
}

export interface SocketServerCustomEvents {
  "message:new": (message: Message) => void;
  typing: (payload: TypingEventPayload) => void;
  "conversation:updated": (conversation: Conversation) => void;
  "call:incoming": (payload: CallIncomingPayload) => void;
  "call:answered": (payload: CallAnsweredPayload) => void;
  "call:ice": (payload: CallIcePayload) => void;
  "call:rejected": (payload: CallStatePayload) => void;
  "call:ended": (payload: CallStatePayload) => void;
}

export interface SocketServerToClientEvents extends SocketServerCustomEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
}

export type ClientSocketEventName = keyof SocketClientToServerEvents;
export type ServerSocketEventName = keyof SocketServerToClientEvents;
export type ServerSocketHandler<E extends ServerSocketEventName> = SocketServerToClientEvents[E];

export interface SocketClient {
  connect(): void;
  disconnect(): void;
  emit<E extends ClientSocketEventName>(
    event: E,
    payload: SocketClientToServerEvents[E],
  ): Promise<SocketAckResponses[E]>;
  on<E extends ServerSocketEventName>(event: E, handler: ServerSocketHandler<E>): void;
  off<E extends ServerSocketEventName>(event: E, handler: ServerSocketHandler<E>): void;
  isConnected(): boolean;
}
