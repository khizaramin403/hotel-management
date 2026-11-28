import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";
import { Pool } from "pg";

const REQUIRED_ENV_VARS = [
  "NODE_ENV",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_TTL",
  "INTERNAL_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "ALLOWED_ORIGINS",
  "GATEWAY_PORT",
  "AUTH_SERVICE_PORT",
  "ROOM_SERVICE_PORT",
  "BOOKING_SERVICE_PORT",
  "CHAT_SERVICE_PORT",
  "NOTIFICATION_SERVICE_PORT",
] as const;

const PORT_ENV_VARS = new Set<string>([
  "GATEWAY_PORT",
  "AUTH_SERVICE_PORT",
  "ROOM_SERVICE_PORT",
  "BOOKING_SERVICE_PORT",
  "CHAT_SERVICE_PORT",
  "NOTIFICATION_SERVICE_PORT",
]);

function loadDotEnvFile(envPath: string): boolean {
  if (!fs.existsSync(envPath)) {
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

function getErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    const messages = error.errors.map((item) => getErrorMessage(item)).filter(Boolean);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}

function checkEnvVars(): boolean {
  let allOk = true;

  for (const key of REQUIRED_ENV_VARS) {
    const raw = process.env[key];
    const value = raw?.trim() ?? "";

    if (value.length === 0) {
      console.log(`FAIL  env:${key} (missing or empty)`);
      allOk = false;
      continue;
    }

    if (PORT_ENV_VARS.has(key)) {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.log(`FAIL  env:${key} (invalid port)`);
        allOk = false;
        continue;
      }
    }

    console.log(`OK    env:${key}`);
  }

  return allOk;
}

async function checkPostgres(databaseUrl: string | undefined): Promise<boolean> {
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    console.log("FAIL  postgres (DATABASE_URL is not set)");
    return false;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    max: 1,
  });

  try {
    await pool.query("SELECT 1");
    console.log("OK    postgres (connected)");
    return true;
  } catch (error: unknown) {
    console.log(`FAIL  postgres (${getErrorMessage(error)})`);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function checkRedis(redisUrl: string | undefined): Promise<boolean> {
  if (!redisUrl || redisUrl.trim().length === 0) {
    console.log("FAIL  redis (REDIS_URL is not set)");
    return false;
  }

  const redis = new Redis(redisUrl, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  let lastErrorMessage: string | null = null;
  redis.on("error", (error: unknown) => {
    lastErrorMessage = getErrorMessage(error);
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") {
      console.log(`FAIL  redis (unexpected PING response: ${pong})`);
      return false;
    }
    console.log("OK    redis (connected)");
    return true;
  } catch (error: unknown) {
    console.log(`FAIL  redis (${lastErrorMessage ?? getErrorMessage(error)})`);
    return false;
  } finally {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  }
}

async function main(): Promise<void> {
  const envPath = path.resolve(process.cwd(), ".env");
  const envFileLoaded = loadDotEnvFile(envPath);
  if (envFileLoaded) {
    console.log("OK    file:.env");
  } else {
    console.log("INFO  file:.env not found (reading process environment)");
  }

  const envOk = checkEnvVars();
  const pgOk = await checkPostgres(process.env.DATABASE_URL);
  const redisOk = await checkRedis(process.env.REDIS_URL);

  if (!envOk || !pgOk || !redisOk) {
    process.exitCode = 1;
  }
}

void main();
