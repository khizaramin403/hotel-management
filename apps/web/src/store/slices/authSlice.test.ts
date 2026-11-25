import type { User } from "@hotel/shared";
import { describe, expect, it } from "vitest";
import {
  authReducer,
  clearAuth,
  resetAuth,
  selectAuthRole,
  selectAuthStatus,
  selectAuthUser,
  selectIsAuthenticated,
  setAuthLoading,
  setAuthUser,
} from "./authSlice";

const SAMPLE_USER: User = {
  id: 7,
  name: "Sara Khan",
  email: "guest@example.com",
  role: "guest",
};

describe("authSlice", () => {
  it("transitions from idle to loading and authenticated with user payload", () => {
    const loadingState = authReducer(undefined, setAuthLoading());
    expect(selectAuthStatus({ auth: loadingState })).toBe("loading");
    expect(selectAuthUser({ auth: loadingState })).toBeNull();

    const authedState = authReducer(loadingState, setAuthUser(SAMPLE_USER));
    expect(selectAuthStatus({ auth: authedState })).toBe("authenticated");
    expect(selectAuthUser({ auth: authedState })).toEqual(SAMPLE_USER);
    expect(selectAuthRole({ auth: authedState })).toBe("guest");
    expect(selectIsAuthenticated({ auth: authedState })).toBe(true);
  });

  it("clears user on unauthenticated logout and resets back to idle", () => {
    const authedState = authReducer(undefined, setAuthUser(SAMPLE_USER));
    const clearedState = authReducer(authedState, clearAuth());

    expect(selectAuthUser({ auth: clearedState })).toBeNull();
    expect(selectAuthStatus({ auth: clearedState })).toBe("unauthenticated");
    expect(selectAuthRole({ auth: clearedState })).toBeNull();
    expect(selectIsAuthenticated({ auth: clearedState })).toBe(false);

    const resetState = authReducer(clearedState, resetAuth());
    expect(selectAuthStatus({ auth: resetState })).toBe("idle");
  });
});
