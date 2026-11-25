import { ERROR_CODES, type ErrorCode, type ValidationErrorDetail } from "@hotel/shared";
import axios from "axios";

export type ApiClientErrorCode = ErrorCode | "NETWORK_ERROR" | "UNKNOWN_ERROR";

export interface ApiClientErrorInit {
  status: number;
  code: ApiClientErrorCode;
  message: string;
  details?: ValidationErrorDetail[];
  requestId?: string;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiClientErrorCode;
  readonly details?: ValidationErrorDetail[];
  readonly requestId?: string;

  constructor(init: ApiClientErrorInit) {
    super(init.message);
    this.name = "ApiClientError";
    this.status = init.status;
    this.code = init.code;
    if (init.details !== undefined) {
      this.details = init.details;
    }
    if (init.requestId !== undefined) {
      this.requestId = init.requestId;
    }
  }
}

const KNOWN_ERROR_CODES = new Set<string>(ERROR_CODES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiClientErrorCode(value: unknown): value is ApiClientErrorCode {
  return (
    typeof value === "string" &&
    (KNOWN_ERROR_CODES.has(value) || value === "NETWORK_ERROR" || value === "UNKNOWN_ERROR")
  );
}

function parseDetails(raw: unknown): ValidationErrorDetail[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const parsed: ValidationErrorDetail[] = [];
  for (const item of raw) {
    if (isRecord(item) && typeof item.field === "string" && typeof item.message === "string") {
      parsed.push({ field: item.field, message: item.message });
    }
  }
  return parsed;
}

export function extractRequestId(headers: unknown): string | undefined {
  if (!isRecord(headers)) {
    return undefined;
  }

  if ("get" in headers && typeof headers.get === "function") {
    const val = (headers.get as (name: string) => unknown)("x-request-id");
    if (typeof val === "string" && val.length > 0) {
      return val;
    }
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "x-request-id" && typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function fallbackCodeForStatus(status: number): ApiClientErrorCode {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "UNKNOWN_ERROR";
}

/** Normalizes Axios, network, and envelope errors into ApiClientError. */
export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const configRequestId = extractRequestId(error.config?.headers);

    if (!error.response) {
      return new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message:
          error.code === "ECONNABORTED"
            ? "Request timed out. Please try again."
            : "Network error. Check your connection and try again.",
        requestId: configRequestId,
      });
    }

    const { status, data, headers } = error.response;
    const requestId = extractRequestId(headers) ?? configRequestId;

    if (isRecord(data) && isRecord(data.error)) {
      const envelopeError = data.error;
      const code = isApiClientErrorCode(envelopeError.code)
        ? envelopeError.code
        : fallbackCodeForStatus(status);
      const message =
        typeof envelopeError.message === "string" && envelopeError.message.length > 0
          ? envelopeError.message
          : "Request failed. Please try again.";
      const details = parseDetails(envelopeError.details);

      return new ApiClientError({
        status,
        code,
        message,
        details,
        requestId,
      });
    }

    return new ApiClientError({
      status,
      code: fallbackCodeForStatus(status),
      message: "Request failed. Please try again.",
      requestId,
    });
  }

  return new ApiClientError({
    status: 0,
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : "An unexpected error occurred.",
  });
}
