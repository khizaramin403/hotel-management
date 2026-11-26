import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AntdProvider } from "@/providers/AntdProvider";
import type { SalesBarChartProps } from "./SalesBarChart";

const hoisted = vi.hoisted(() => ({
  calls: [] as Array<{
    ssr?: boolean;
    hasLoading: boolean;
  }>,
  gate: null as { promise: Promise<void>; resolve: () => void } | null,
}));

function createGate() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

vi.mock("./SalesBarChart", () => ({
  SalesBarChart: function StubSalesBarChart({ daily }: SalesBarChartProps) {
    return <div data-testid="lazy-sales-chart-stub">Loaded {daily.length} day(s)</div>;
  },
}));

vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<
      { default: ComponentType<SalesBarChartProps> } | ComponentType<SalesBarChartProps>
    >,
    options?: { ssr?: boolean; loading?: () => ReactNode },
  ) => {
    hoisted.calls.push({
      ssr: options?.ssr,
      hasLoading: typeof options?.loading === "function",
    });

    const LazyComponent = lazy(async () => {
      if (hoisted.gate) {
        await hoisted.gate.promise;
      }
      const loaded = await loader();
      if (typeof loaded === "function") {
        return { default: loaded };
      }
      return loaded;
    });

    return function MockDynamicComponent(props: SalesBarChartProps) {
      const fallback = options?.loading ? options.loading() : null;
      return (
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      );
    };
  },
}));

import { SalesChartCard } from "./SalesChartCard";

describe("SalesChartCard", () => {
  afterEach(() => {
    hoisted.gate = null;
  });

  it("lazy loads SalesBarChart with next/dynamic (ssr: false) and shows Skeleton fallback until resolved", async () => {
    expect(hoisted.calls).toEqual([{ ssr: false, hasLoading: true }]);

    hoisted.gate = createGate();

    render(
      <AntdProvider>
        <SalesChartCard
          daily={[{ date: "2026-11-25", revenue: 45000, bookings: 2 }]}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      </AntdProvider>,
    );

    // While the dynamic chunk is still loading, the Skeleton fallback is displayed.
    expect(screen.getByRole("status", { name: "Loading sales chart" })).toBeDefined();
    expect(screen.queryByTestId("lazy-sales-chart-stub")).toBeNull();

    hoisted.gate.resolve();

    await waitFor(() => {
      expect(screen.getByTestId("lazy-sales-chart-stub")).toBeDefined();
    });
    expect(screen.queryByRole("status", { name: "Loading sales chart" })).toBeNull();
    expect(screen.getByText("Loaded 1 day(s)")).toBeDefined();
  }, 15_000);

  it("renders error Alert with Try again and empty state cleanly", () => {
    const onRetry = vi.fn();

    const { rerender } = render(
      <AntdProvider>
        <SalesChartCard daily={[]} isLoading={false} isError onRetry={onRetry} />
      </AntdProvider>,
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Could not load sales chart")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <AntdProvider>
        <SalesChartCard daily={[]} isLoading={false} isError={false} onRetry={onRetry} />
      </AntdProvider>,
    );

    expect(screen.getByText("No sales data yet")).toBeDefined();
  });
});
