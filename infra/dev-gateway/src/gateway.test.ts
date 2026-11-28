import http from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { Writable } from "node:stream";
import pino from "pino";
import { afterEach, describe, expect, it } from "vitest";
import { createGatewayServer } from "./gateway";
import { matchGatewayRoute } from "./routes";

interface RecordedRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
}

interface MockUpstream {
  url: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

async function startMockUpstream(
  name: string,
  options: {
    healthStatus?: number;
    healthDelayMs?: number;
    onUpgrade?: (req: http.IncomingMessage, socket: Socket) => void;
  } = {},
): Promise<MockUpstream> {
  const requests: RecordedRequest[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const sockets = new Set<Socket>();

  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    if (url === "/health") {
      const sendHealth = () => {
        if (res.writableEnded || res.destroyed) {
          return;
        }
        res.statusCode = options.healthStatus ?? 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "ok", service: name }));
      };
      if (options.healthDelayMs) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          sendHealth();
        }, options.healthDelayMs);
        timers.add(timer);
      } else {
        sendHealth();
      }
      return;
    }

    requests.push({
      method: req.method ?? "GET",
      url,
      headers: req.headers,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Set-Cookie", `${name}_session=ok; Path=/; HttpOnly`);
    res.end(
      JSON.stringify({
        service: name,
        url,
        headers: {
          requestId: req.headers["x-request-id"],
          cookie: req.headers.cookie,
          forwardedFor: req.headers["x-forwarded-for"],
          forwardedHost: req.headers["x-forwarded-host"],
          forwardedProto: req.headers["x-forwarded-proto"],
          forwardedPort: req.headers["x-forwarded-port"],
        },
      }),
    );
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });

  if (options.onUpgrade) {
    server.on("upgrade", (req, socket) => {
      const netSocket = socket as Socket;
      sockets.add(netSocket);
      netSocket.once("close", () => sockets.delete(netSocket));
      netSocket.once("end", () => netSocket.destroy());
      options.onUpgrade?.(req, netSocket);
    });
  }

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const timer of timers) {
          clearTimeout(timer);
        }
        timers.clear();
        for (const socket of sockets) {
          socket.destroy();
        }
        sockets.clear();
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function trackAndCloser(server: http.Server): () => Promise<void> {
  const sockets = new Set<Socket>();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  return () =>
    new Promise<void>((resolve, reject) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
      server.closeAllConnections();
      server.close((err) => (err ? reject(err) : resolve()));
    });
}

async function getUnusedPort(): Promise<number> {
  const server = http.createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  return port;
}

describe("matchGatewayRoute", () => {
  it("matches all contract route prefixes and rejects internal or unknown paths", () => {
    expect(matchGatewayRoute("/api/v1/auth/login")).toEqual({
      prefix: "/api/v1/auth",
      service: "auth",
    });
    expect(matchGatewayRoute("/api/v1/rooms/12?guests=2")).toEqual({
      prefix: "/api/v1/rooms",
      service: "room",
    });
    expect(matchGatewayRoute("/api/v1/bookings/my")).toEqual({
      prefix: "/api/v1/bookings",
      service: "booking",
    });
    expect(matchGatewayRoute("/api/v1/chat/conversations")).toEqual({
      prefix: "/api/v1/chat",
      service: "chat",
    });
    expect(matchGatewayRoute("/api/v1/notifications/push/public-key")).toEqual({
      prefix: "/api/v1/notifications",
      service: "notification",
    });
    expect(matchGatewayRoute("/socket.io/?EIO=4&transport=websocket")).toEqual({
      prefix: "/socket.io",
      service: "chat",
      ws: true,
    });

    expect(matchGatewayRoute("/api/v1/auth-other")).toBeNull();
    expect(matchGatewayRoute("/internal")).toBeNull();
    expect(matchGatewayRoute("/internal/rooms/1")).toBeNull();
    expect(matchGatewayRoute("/unknown")).toBeNull();
  });
});

describe("dev-gateway HTTP, WebSocket, and health", () => {
  const closers: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (closers.length > 0) {
      const close = closers.pop();
      if (close) {
        await close();
      }
    }
  });

  function createMemoryLogger(): { logger: pino.Logger; lines: Array<Record<string, unknown>> } {
    const lines: Array<Record<string, unknown>> = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        const text = chunk.toString().trim();
        if (text) {
          for (const line of text.split(/\r?\n/)) {
            lines.push(JSON.parse(line) as Record<string, unknown>);
          }
        }
        callback();
      },
    });
    return {
      logger: pino({ level: "info" }, stream),
      lines,
    };
  }

  async function startTestGateway(
    options: Parameters<typeof createGatewayServer>[0] = {},
  ): Promise<{ port: number; baseUrl: string }> {
    const { server } = createGatewayServer(options);
    const closeGateway = trackAndCloser(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    closers.push(closeGateway);
    const port = (server.address() as AddressInfo).port;
    return { port, baseUrl: `http://127.0.0.1:${port}` };
  }

  it("routes requests to matching services, forwards cookies and x-forwarded headers, sets x-request-id, and logs one Pino line per request", async () => {
    const auth = await startMockUpstream("auth");
    const room = await startMockUpstream("room");
    const booking = await startMockUpstream("booking");
    const chat = await startMockUpstream("chat");
    const notification = await startMockUpstream("notification");
    closers.push(auth.close, room.close, booking.close, chat.close, notification.close);

    const { logger, lines } = createMemoryLogger();
    const { port: gatewayPort, baseUrl } = await startTestGateway({
      targets: {
        auth: auth.url,
        room: room.url,
        booking: booking.url,
        chat: chat.url,
        notification: notification.url,
      },
      logger,
    });

    const authRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        cookie: "access_token=jwt123",
      },
    });
    expect(authRes.status).toBe(200);
    const generatedId = authRes.headers.get("x-request-id");
    expect(generatedId).toBeTruthy();
    expect(authRes.headers.get("set-cookie")).toContain("auth_session=ok");
    const authJson = (await authRes.json()) as {
      service: string;
      url: string;
      headers: Record<string, string>;
    };
    expect(authJson.service).toBe("auth");
    expect(authJson.url).toBe("/api/v1/auth/me");
    expect(authJson.headers.requestId).toBe(generatedId);
    expect(authJson.headers.cookie).toBe("access_token=jwt123");
    expect(authJson.headers.forwardedFor).toBeTruthy();
    expect(authJson.headers.forwardedHost).toBe(`127.0.0.1:${gatewayPort}`);
    expect(authJson.headers.forwardedProto).toBe("http");
    expect(authJson.headers.forwardedPort).toBe(String(gatewayPort));

    const routes: Array<[string, string]> = [
      ["/api/v1/rooms?type=Deluxe", "room"],
      ["/api/v1/bookings/my", "booking"],
      ["/api/v1/chat/conversations", "chat"],
      ["/api/v1/notifications/push/public-key", "notification"],
      ["/socket.io/?EIO=4&transport=polling", "chat"],
    ];

    for (const [path, expectedService] of routes) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { "x-request-id": `req-${expectedService}` },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("x-request-id")).toBe(`req-${expectedService}`);
      const json = (await res.json()) as { service: string; url: string };
      expect(json.service).toBe(expectedService);
      expect(json.url).toBe(path);
    }

    expect(lines).toHaveLength(6);
    expect(lines[0]?.requestId).toBe(generatedId);
    expect(lines[0]?.statusCode).toBe(200);
  });

  it("never proxies /internal routes and returns 404 envelope", async () => {
    const room = await startMockUpstream("room");
    closers.push(room.close);

    const { logger } = createMemoryLogger();
    const { baseUrl } = await startTestGateway({
      targets: { room: room.url },
      logger,
    });

    for (const blockedPath of ["/internal", "/internal/rooms/1", "/internal/availability"]) {
      const res = await fetch(`${baseUrl}${blockedPath}`);
      expect(res.status).toBe(404);
      expect(res.headers.get("x-request-id")).toBeTruthy();
      expect(await res.json()).toEqual({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Not found",
        },
      });
    }

    expect(room.requests).toHaveLength(0);
  });

  it("returns 502 INTERNAL_ERROR 'Service unavailable' envelope when target service is down", async () => {
    const deadPort = await getUnusedPort();
    const { logger, lines } = createMemoryLogger();
    const { baseUrl } = await startTestGateway({
      targets: {
        booking: `http://127.0.0.1:${deadPort}`,
      },
      logger,
    });

    const res = await fetch(`${baseUrl}/api/v1/bookings/my`, {
      headers: { "x-request-id": "down-req-1" },
    });

    expect(res.status).toBe(502);
    expect(res.headers.get("x-request-id")).toBe("down-req-1");
    expect(await res.json()).toEqual({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Service unavailable",
      },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.statusCode).toBe(502);
    expect(lines[0]?.requestId).toBe("down-req-1");
  });

  it("handles websocket upgrades on /socket.io and rejects upgrades on /internal", async () => {
    const chat = await startMockUpstream("chat", {
      onUpgrade: (req, socket) => {
        const key = req.headers["sec-websocket-key"] ?? "";
        socket.write(
          [
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            `X-Saw-Request-Id: ${String(req.headers["x-request-id"] ?? "")}`,
            `X-Saw-Key: ${key}`,
            "",
            "",
          ].join("\r\n"),
        );
        socket.on("data", (chunk) => {
          socket.write(chunk);
        });
      },
    });
    closers.push(chat.close);

    const { logger } = createMemoryLogger();
    const { port: gatewayPort } = await startTestGateway({
      targets: { chat: chat.url },
      logger,
    });

    const echoed = await new Promise<string>((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: gatewayPort,
        path: "/socket.io/?EIO=4&transport=websocket",
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
          "Sec-WebSocket-Version": "13",
        },
      });
      req.on("upgrade", (res, socket) => {
        expect(res.headers["x-saw-request-id"]).toBeTruthy();
        socket.on("data", (data) => {
          const text = data.toString();
          socket.destroy();
          resolve(text);
        });
        socket.write("ping-ws");
      });
      req.on("error", reject);
      req.end();
    });
    expect(echoed).toBe("ping-ws");

    const blockedStatus = await new Promise<number>((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: gatewayPort,
        path: "/internal/socket",
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
          "Sec-WebSocket-Version": "13",
        },
      });
      req.on("response", (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", reject);
      req.end();
    });
    expect(blockedStatus).toBe(404);
  });

  it("reports up/down service health on GET /health with timeout", async () => {
    const auth = await startMockUpstream("auth", { healthStatus: 200 });
    const room = await startMockUpstream("room", { healthStatus: 500 });
    const booking = await startMockUpstream("booking", { healthDelayMs: 1200 });
    const chat = await startMockUpstream("chat", { healthStatus: 200 });
    const deadPort = await getUnusedPort();
    closers.push(auth.close, room.close, booking.close, chat.close);

    const { logger } = createMemoryLogger();
    const { baseUrl } = await startTestGateway({
      targets: {
        auth: auth.url,
        room: room.url,
        booking: booking.url,
        chat: chat.url,
        notification: `http://127.0.0.1:${deadPort}`,
      },
      healthTimeoutMs: 400,
      logger,
    });

    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      service: string;
      uptime: number;
      services: Record<string, string>;
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("dev-gateway");
    expect(typeof body.uptime).toBe("number");
    expect(body.services).toEqual({
      auth: "up",
      room: "down",
      booking: "down",
      chat: "up",
      notification: "down",
    });
  });
});
