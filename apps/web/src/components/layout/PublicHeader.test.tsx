import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import { login } from "@/lib/api/endpoints/auth";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { PublicHeader } from "./PublicHeader";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => "/",
}));

describe("PublicHeader logout", () => {
  beforeEach(() => {
    mockPush.mockReset();
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

  it("calls logout API, clears Redux user, clears query cache, and redirects home", async () => {
    const user = await login({ email: "guest@example.com", password: "Passw0rd!123" });
    const store = makeStore();
    store.dispatch(setAuthUser(user));

    const queryClient = new QueryClient();
    queryClient.setQueryData(["rooms", "list"], { items: [{ id: 1 }] });
    const clearSpy = vi.spyOn(queryClient, "clear");

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <PublicHeader />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Log out"));

    await waitFor(() => {
      expect(store.getState().auth.status).toBe("unauthenticated");
      expect(store.getState().auth.user).toBeNull();
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(queryClient.getQueryData(["rooms", "list"])).toBeUndefined();
    expect(document.cookie).not.toContain("mock_role=guest");
  });
});
