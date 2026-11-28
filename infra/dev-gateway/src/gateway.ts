import crypto from "node:crypto";
import http from "node:http";
import type net from "node:net";
import { ERROR_CODE, type ErrorCode, type ErrorResponse } from "@hotel/shared";
import express, { type NextFunction, type Request, type Response } from "express";
import { createProxyMiddleware, type RequestHandler } from "http-proxy-middleware";
import pino, { type Logger } from "pino";
import { getGatewayConfig, type ServiceTargets } from "./env";
import { checkAllServicesHealth, type GatewayHealthPayload } from "./health";
import { extractPathname, GATEWAY_ROUTES, isInternalPath, matchesRoutePrefix } from "./routes";

export interface GatewayOptions {
  targets?: Partial<ServiceTargets>;
  healthTimeoutMs?: number;
  logger?: Logger;
}

const SILENT_HPM_LOGGER = {
  info: (): void => {},
  warn: (): void => {},
  error: (): void => {},
};

function createErrorEnvelope(code: ErrorCode, message: string): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

function getOrCreateRequestId(headers: http.IncomingHttpHeaders): string {
  const incoming = headers["x-request-id"];
  if (typeof incoming === "string" && incoming.trim().length > 0) {
    return incoming.trim();
  }
  if (Array.isArray(incoming)) {
    const firstNonEmpty = incoming.find((item) => item.trim().length > 0);
    if (firstNonEmpty) {
      return firstNonEmpty.trim();
    }
  }
  return crypto.randomUUID();
}

function isServerResponse(res: http.ServerResponse | net.Socket): res is http.ServerResponse {
  return "writeHead" in res && typeof res.writeHead === "function";
}

function sendJsonError(
  res: http.ServerResponse,
  statusCode: number,
  code: ErrorCode,
  message: string,
  requestId: string,
): void {
  if (res.headersSent) {
    if (!res.writableEnded) {
      res.end();
    }
    return;
  }

  res.statusCode = statusCode;
  res.setHeader("x-request-id", requestId);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(createErrorEnvelope(code, message)));
}

/** Creates the Express application and HTTP server for the development API gateway. */
export function createGatewayServer(options: GatewayOptions = {}): {
  app: express.Express;
  server: http.Server;
  targets: ServiceTargets;
  logger: Logger;
} {
  const defaultConfig = getGatewayConfig();
  const targets: ServiceTargets = {
    ...defaultConfig.targets,
    ...options.targets,
  };
  const healthTimeoutMs = options.healthTimeoutMs ?? defaultConfig.healthTimeoutMs;
  const logger =
    options.logger ??
    pino({
      name: "dev-gateway",
      level: process.env.LOG_LEVEL ?? "info",
    });

  const app = express();
  app.disable("x-powered-by");

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = getOrCreateRequestId(req.headers);
    req.headers["x-request-id"] = requestId;
    res.setHeader("x-request-id", requestId);

    const startNs = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      const proxyError =
        typeof res.locals.proxyError === "string" ? res.locals.proxyError : undefined;

      logger.info(
        {
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          ...(proxyError ? { error: proxyError } : {}),
        },
        "request",
      );
    });

    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isInternalPath(req.path)) {
      res.status(404).json(createErrorEnvelope(ERROR_CODE.NOT_FOUND, "Not found"));
      return;
    }
    next();
  });

  app.get("/health", async (_req: Request, res: Response) => {
    const services = await checkAllServicesHealth(targets, healthTimeoutMs);
    const payload: GatewayHealthPayload = {
      status: "ok",
      service: "dev-gateway",
      uptime: Number(process.uptime().toFixed(2)),
      services,
    };
    res.status(200).json(payload);
  });

  let socketProxy: RequestHandler | null = null;

  for (const route of GATEWAY_ROUTES) {
    const target = targets[route.service];
    const proxy = createProxyMiddleware({
      target,
      pathFilter: (_pathname, req) => matchesRoutePrefix(extractPathname(req.url), route.prefix),
      xfwd: true,
      changeOrigin: false,
      // WebSocket upgrades are dispatched explicitly on server 'upgrade' so /socket.io works before any HTTP request and /internal upgrades are rejected.
      ws: false,
      logger: SILENT_HPM_LOGGER,
      on: {
        error: (err, req, res) => {
          const requestId = getOrCreateRequestId(req.headers);
          if (isServerResponse(res)) {
            const expressRes = res as Response;
            if (expressRes.locals) {
              expressRes.locals.proxyError = err.message;
            }
            sendJsonError(res, 502, ERROR_CODE.INTERNAL_ERROR, "Service unavailable", requestId);
            return;
          }

          logger.error(
            {
              requestId,
              method: req.method ?? "UPGRADE",
              path: req.url ?? "",
              error: err.message,
            },
            "websocket proxy error",
          );
          if (!res.destroyed) {
            res.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
            res.destroy();
          }
        },
      },
    });

    if (route.ws) {
      socketProxy = proxy;
    }

    app.use(proxy);
  }

  app.use((_req: Request, res: Response) => {
    res.status(404).json(createErrorEnvelope(ERROR_CODE.NOT_FOUND, "Route not found"));
  });

  const server = http.createServer(app);

  server.on("upgrade", (req, socket, head) => {
    const pathname = extractPathname(req.url);
    const requestId = getOrCreateRequestId(req.headers);
    req.headers["x-request-id"] = requestId;

    if (!isInternalPath(pathname) && matchesRoutePrefix(pathname, "/socket.io") && socketProxy) {
      logger.info(
        {
          requestId,
          method: "UPGRADE",
          path: req.url ?? pathname,
        },
        "websocket upgrade",
      );
      socketProxy.upgrade(req, socket as net.Socket, head);
      return;
    }

    logger.info(
      {
        requestId,
        method: "UPGRADE",
        path: req.url ?? pathname,
        statusCode: 404,
      },
      "websocket rejected",
    );
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
  });

  return { app, server, targets, logger };
}
