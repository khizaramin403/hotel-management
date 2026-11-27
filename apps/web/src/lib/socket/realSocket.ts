import type { Message } from "@hotel/shared";
import { io, type Socket } from "socket.io-client";
import type {
  ClientSocketEventName,
  ServerSocketEventName,
  ServerSocketHandler,
  SocketAckResponses,
  SocketClient,
  SocketClientToServerEvents,
  SocketServerCustomEvents,
} from "./types";

const ACK_TIMEOUT_MS = 10_000;

interface SocketClientEmitMap {
  "message:send": (
    payload: SocketClientToServerEvents["message:send"],
    ack: (message: Message) => void,
  ) => void;
  "typing:start": (payload: SocketClientToServerEvents["typing:start"]) => void;
  "typing:stop": (payload: SocketClientToServerEvents["typing:stop"]) => void;
  "conversation:read": (payload: SocketClientToServerEvents["conversation:read"]) => void;
  "call:offer": (payload: SocketClientToServerEvents["call:offer"]) => void;
  "call:answer": (payload: SocketClientToServerEvents["call:answer"]) => void;
  "call:ice": (payload: SocketClientToServerEvents["call:ice"]) => void;
  "call:reject": (payload: SocketClientToServerEvents["call:reject"]) => void;
  "call:end": (payload: SocketClientToServerEvents["call:end"]) => void;
}

export class RealSocket implements SocketClient {
  private readonly socket: Socket<SocketServerCustomEvents, SocketClientEmitMap>;

  constructor(url: string) {
    this.socket = io(url, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
    });
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  async emit<E extends ClientSocketEventName>(
    event: E,
    payload: SocketClientToServerEvents[E],
  ): Promise<SocketAckResponses[E]> {
    if (event === "message:send") {
      const ack = await this.socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck("message:send", payload as SocketClientToServerEvents["message:send"]);
      return ack as SocketAckResponses[E];
    }

    switch (event) {
      case "typing:start":
        this.socket.emit("typing:start", payload as SocketClientToServerEvents["typing:start"]);
        break;
      case "typing:stop":
        this.socket.emit("typing:stop", payload as SocketClientToServerEvents["typing:stop"]);
        break;
      case "conversation:read":
        this.socket.emit(
          "conversation:read",
          payload as SocketClientToServerEvents["conversation:read"],
        );
        break;
      case "call:offer":
        this.socket.emit("call:offer", payload as SocketClientToServerEvents["call:offer"]);
        break;
      case "call:answer":
        this.socket.emit("call:answer", payload as SocketClientToServerEvents["call:answer"]);
        break;
      case "call:ice":
        this.socket.emit("call:ice", payload as SocketClientToServerEvents["call:ice"]);
        break;
      case "call:reject":
        this.socket.emit("call:reject", payload as SocketClientToServerEvents["call:reject"]);
        break;
      case "call:end":
        this.socket.emit("call:end", payload as SocketClientToServerEvents["call:end"]);
        break;
    }

    return undefined as SocketAckResponses[E];
  }

  on<E extends ServerSocketEventName>(event: E, handler: ServerSocketHandler<E>): void {
    this.updateListener("on", event, handler);
  }

  off<E extends ServerSocketEventName>(event: E, handler: ServerSocketHandler<E>): void {
    this.updateListener("off", event, handler);
  }

  private updateListener<E extends ServerSocketEventName>(
    mode: "on" | "off",
    event: E,
    handler: ServerSocketHandler<E>,
  ): void {
    switch (event) {
      case "connect":
        this.socket[mode]("connect", handler as ServerSocketHandler<"connect">);
        break;
      case "disconnect":
        this.socket[mode]("disconnect", handler as ServerSocketHandler<"disconnect">);
        break;
      case "message:new":
        this.socket[mode]("message:new", handler as ServerSocketHandler<"message:new">);
        break;
      case "typing":
        this.socket[mode]("typing", handler as ServerSocketHandler<"typing">);
        break;
      case "conversation:updated":
        this.socket[mode](
          "conversation:updated",
          handler as ServerSocketHandler<"conversation:updated">,
        );
        break;
      case "call:incoming":
        this.socket[mode]("call:incoming", handler as ServerSocketHandler<"call:incoming">);
        break;
      case "call:answered":
        this.socket[mode]("call:answered", handler as ServerSocketHandler<"call:answered">);
        break;
      case "call:ice":
        this.socket[mode]("call:ice", handler as ServerSocketHandler<"call:ice">);
        break;
      case "call:rejected":
        this.socket[mode]("call:rejected", handler as ServerSocketHandler<"call:rejected">);
        break;
      case "call:ended":
        this.socket[mode]("call:ended", handler as ServerSocketHandler<"call:ended">);
        break;
    }
  }
}
