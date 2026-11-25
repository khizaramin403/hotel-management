import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { ApiClientError, normalizeApiError } from "./errors";

const DEFAULT_API_BASE_URL = "/api/v1";
const REQUEST_TIMEOUT_MS = 15_000;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

export interface ApiAuthHandlers {
  onUnauthorized?: () => void;
  redirectToLogin?: (url: string) => void;
}

let authHandlers: ApiAuthHandlers = {};
let refreshPromise: Promise<void> | null = null;
let mockInitPromise: Promise<void> | null = null;

export function configureApiAuthHandlers(handlers: ApiAuthHandlers): void {
  authHandlers = handlers;
}

export function resetMockInitForTests(): void {
  mockInitPromise = null;
}

export function ensureMocksInitialized(): Promise<void> {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_USE_MOCKS !== "true") {
    return Promise.resolve();
  }

  if (!mockInitPromise) {
    mockInitPromise = import("@/mocks")
      .then(({ setupMocks }) => {
        setupMocks(apiClient);
      })
      .catch((error: unknown) => {
        mockInitPromise = null;
        throw error;
      });
  }

  return mockInitPromise;
}

function generateRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const randomHex = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-a${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`;
}

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
}

function defaultRedirectToLogin(url: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.location.assign(url);
  } catch {
    // Ignore jsdom unimplemented navigation errors when no custom redirect handler is supplied.
  }
}

function handleRefreshFailure(): void {
  authHandlers.onUnauthorized?.();

  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname === "/login") {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const targetUrl = `/login?next=${encodeURIComponent(currentPath)}`;
  const redirect = authHandlers.redirectToLogin ?? defaultRedirectToLogin;
  redirect(targetUrl);
}

function isRefreshRequest(config: RetryableRequestConfig): boolean {
  if (config._skipAuthRefresh) {
    return true;
  }
  const url = config.url ?? "";
  return url === "/auth/refresh" || url.endsWith("/auth/refresh");
}

async function refreshAccessToken(client: AxiosInstance): Promise<void> {
  if (!refreshPromise) {
    const refreshConfig: Partial<RetryableRequestConfig> = {
      _skipAuthRefresh: true,
    };

    refreshPromise = client
      .post("/auth/refresh", undefined, refreshConfig)
      .then(() => undefined)
      .catch((refreshError: unknown) => {
        handleRefreshFailure();
        throw normalizeApiError(refreshError);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

apiClient.interceptors.request.use(async (config) => {
  await ensureMocksInitialized();
  if (apiClient.defaults.adapter) {
    config.adapter = apiClient.defaults.adapter;
  }
  config.headers.set("x-request-id", generateRequestId());
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const normalizedError = normalizeApiError(error);

    if (
      axios.isAxiosError(error) &&
      error.config &&
      normalizedError.status === 401 &&
      normalizedError.code === "TOKEN_EXPIRED"
    ) {
      const originalConfig = error.config as RetryableRequestConfig;
      if (!originalConfig._retry && !isRefreshRequest(originalConfig)) {
        originalConfig._retry = true;
        await refreshAccessToken(apiClient);
        return apiClient(originalConfig);
      }
    }

    return Promise.reject(normalizedError);
  },
);

export { ApiClientError, normalizeApiError };
