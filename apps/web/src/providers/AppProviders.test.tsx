import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import { resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { teardownMocks } from "@/mocks";
import { AppProviders } from "@/providers/AppProviders";
import { useAppSelector } from "@/store/hooks";
import { selectAuthStatus, selectAuthUser } from "@/store/slices/authSlice";

function AuthBootstrapProbe() {
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectAuthUser);

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="role">{user?.role ?? "none"}</span>
    </div>
  );
}

describe("AppProviders auth bootstrap", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("sets unauthenticated when GET /auth/me fails on app start", async () => {
    render(
      <AppProviders>
        <AuthBootstrapProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("email").textContent).toBe("none");
  });

  it("bootstraps user into Redux auth slice when session exists", async () => {
    setMockRoleCookie("admin");

    render(
      <AppProviders>
        <AuthBootstrapProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("email").textContent).toBe("admin@example.com");
    expect(screen.getByTestId("role").textContent).toBe("admin");
  });
});
