import {
  createStaffSchema,
  ERROR_CODE,
  idParamSchema,
  loginSchema,
  registerSchema,
  staffQuerySchema,
} from "@hotel/shared";
import type { AxiosRequestConfig } from "axios";
import type MockAdapter from "axios-mock-adapter";
import {
  createMockUser,
  deleteMockUserById,
  findMockUserByEmail,
  getCurrentSessionUser,
  getMockUsers,
  mockError,
  paginatedEnvelope,
  parseJsonBody,
  responseHeadersForRequest,
  setCurrentSessionUser,
  successEnvelope,
  toPublicUser,
  zodIssuesToDetails,
  type MockUserRecord,
} from "../db";

function requireAuthenticated(
  config: AxiosRequestConfig,
): { user: MockUserRecord } | { error: ReturnType<typeof mockError> } {
  const user = getCurrentSessionUser();
  if (!user) {
    return {
      error: mockError(401, ERROR_CODE.UNAUTHENTICATED, "Authentication required", config),
    };
  }
  return { user };
}

function requireAdmin(
  config: AxiosRequestConfig,
): { user: MockUserRecord } | { error: ReturnType<typeof mockError> } {
  const auth = requireAuthenticated(config);
  if ("error" in auth) {
    return auth;
  }
  if (auth.user.role !== "admin") {
    return {
      error: mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config),
    };
  }
  return auth;
}

export function registerAuthHandlers(mock: MockAdapter): void {
  mock.onPost("/auth/register").reply((config) => {
    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid input",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    if (findMockUserByEmail(parsed.data.email)) {
      return mockError(
        409,
        ERROR_CODE.EMAIL_TAKEN,
        "An account with this email already exists",
        config,
      );
    }

    const created = createMockUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: "guest",
    });

    return [
      201,
      successEnvelope({ user: toPublicUser(created) }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onPost("/auth/login").reply((config) => {
    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid input",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    const existing = findMockUserByEmail(parsed.data.email);
    if (!existing || existing.password !== parsed.data.password) {
      return mockError(401, ERROR_CODE.UNAUTHENTICATED, "Email or password is incorrect", config);
    }

    setCurrentSessionUser(existing);
    return [
      200,
      successEnvelope({ user: toPublicUser(existing) }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onPost("/auth/refresh").reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    return [
      200,
      successEnvelope({ user: toPublicUser(auth.user) }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onPost("/auth/logout").reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    setCurrentSessionUser(null);
    return [204, undefined, responseHeadersForRequest(config)];
  });

  mock.onGet("/auth/me").reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    return [
      200,
      successEnvelope({ user: toPublicUser(auth.user) }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet("/auth/staff").reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const parsedQuery = staffQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid query parameters",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const staffUsers = getMockUsers()
      .filter((user) => user.role === "staff")
      .map(toPublicUser);

    return [
      200,
      paginatedEnvelope(staffUsers, parsedQuery.data.page, parsedQuery.data.limit),
      responseHeadersForRequest(config),
    ];
  });

  mock.onPost("/auth/staff").reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid input",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    if (findMockUserByEmail(parsed.data.email)) {
      return mockError(
        409,
        ERROR_CODE.EMAIL_TAKEN,
        "An account with this email already exists",
        config,
      );
    }

    const created = createMockUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: "staff",
    });

    return [
      201,
      successEnvelope({ user: toPublicUser(created) }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onDelete(/\/auth\/staff\/([^/?]+)$/).reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = /\/auth\/staff\/([^/?]+)$/.exec(config.url ?? "");
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid staff id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const deleted = deleteMockUserById(parsedId.data.id, "staff");
    if (!deleted) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Staff account not found", config);
    }

    return [204, undefined, responseHeadersForRequest(config)];
  });
}
