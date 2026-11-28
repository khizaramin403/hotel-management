import fs from "node:fs";
import path from "node:path";

export type ServiceName = "auth" | "room" | "booking" | "chat" | "notification";

export type ServiceTargets = Record<ServiceName, string>;

export interface GatewayConfig {
  port: number;
  healthTimeoutMs: number;
  targets: ServiceTargets;
}

const DEFAULT_GATEWAY_PORT = 8080;
const DEFAULT_HEALTH_TIMEOUT_MS = 1000;
const DEFAULT_SERVICE_PORTS: Record<ServiceName, number> = {
  auth: 3001,
  room: 3002,
  booking: 3003,
  chat: 3004,
  notification: 3005,
};

function findRootEnvPath(startDir: string): string | null {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(current, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

/** Loads environment variables from the nearest `.env` file without overwriting existing values. */
export function loadRootEnv(startDir: string = process.cwd()): boolean {
  const envPath = findRootEnvPath(startDir);
  if (!envPath) {
    return false;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const line = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

/** Builds gateway port and local downstream service URLs from environment variables. */
export function getGatewayConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: parsePort(env.GATEWAY_PORT, DEFAULT_GATEWAY_PORT),
    healthTimeoutMs: DEFAULT_HEALTH_TIMEOUT_MS,
    targets: {
      auth: `http://127.0.0.1:${parsePort(env.AUTH_SERVICE_PORT, DEFAULT_SERVICE_PORTS.auth)}`,
      room: `http://127.0.0.1:${parsePort(env.ROOM_SERVICE_PORT, DEFAULT_SERVICE_PORTS.room)}`,
      booking: `http://127.0.0.1:${parsePort(env.BOOKING_SERVICE_PORT, DEFAULT_SERVICE_PORTS.booking)}`,
      chat: `http://127.0.0.1:${parsePort(env.CHAT_SERVICE_PORT, DEFAULT_SERVICE_PORTS.chat)}`,
      notification: `http://127.0.0.1:${parsePort(env.NOTIFICATION_SERVICE_PORT, DEFAULT_SERVICE_PORTS.notification)}`,
    },
  };
}
