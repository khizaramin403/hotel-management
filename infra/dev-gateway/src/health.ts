import type { ServiceName, ServiceTargets } from "./env";

export type ServiceHealthStatus = "up" | "down";

export type ServicesHealthMap = Record<ServiceName, ServiceHealthStatus>;

export interface GatewayHealthPayload {
  status: "ok";
  service: "dev-gateway";
  uptime: number;
  services: ServicesHealthMap;
}

const SERVICE_NAMES: readonly ServiceName[] = ["auth", "room", "booking", "chat", "notification"];

/** Probes a single service's `/health` endpoint within the configured timeout. */
export async function checkServiceHealth(
  baseUrl: string,
  timeoutMs: number,
): Promise<ServiceHealthStatus> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? "up" : "down";
  } catch {
    return "down";
  }
}

/** Probes all configured downstream services in parallel and returns their up/down status map. */
export async function checkAllServicesHealth(
  targets: ServiceTargets,
  timeoutMs: number,
): Promise<ServicesHealthMap> {
  const entries = await Promise.all(
    SERVICE_NAMES.map(async (name) => {
      const status = await checkServiceHealth(targets[name], timeoutMs);
      return [name, status] as const;
    }),
  );

  return Object.fromEntries(entries) as ServicesHealthMap;
}
