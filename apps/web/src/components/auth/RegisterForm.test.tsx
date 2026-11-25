import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { RegisterForm } from "./RegisterForm";

const mockReplace = vi.fn();
const mockPush = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function renderRegisterForm() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <AntdProvider>
        <RegisterForm />
      </AntdProvider>
    </Provider>,
  );
  return store;
}

describe("RegisterForm", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    currentSearch = "";
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

  it("shows validation messages for invalid name, email, and weak password", async () => {
    renderRegisterForm();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 2 characters")).toBeDefined();
      expect(screen.getByText("Invalid email address")).toBeDefined();
      expect(screen.getByText("Password must be at least 8 characters")).toBeDefined();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("maps 409 EMAIL_TAKEN error onto the email field", async () => {
    renderRegisterForm();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Guest Two" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "guest@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Passw0rd!123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("An account with this email already exists")).toBeDefined();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("creates a new guest account and redirects to /login while preserving next", async () => {
    currentSearch = "?next=%2Fbook%2F3";
    renderRegisterForm();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Zainab Ali" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "zainab@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Passw0rd!123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?registered=1&next=%2Fbook%2F3");
    });
  });
});
