"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureApiAuthHandlers, ensureMocksInitialized } from "@/lib/api/client";
import { getMe } from "@/lib/api/endpoints/auth";
import { makeStore } from "@/store";
import { attachBookingDraftPersistence } from "@/store/bookingDraftStorage";
import { clearAuth, setAuthLoading, setAuthUser } from "@/store/slices/authSlice";
import { AntdProvider } from "./AntdProvider";

const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then((mod) => ({
            default: mod.ReactQueryDevtools,
          })),
        { ssr: false },
      )
    : null;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState(() => makeStore());
  const [queryClient] = useState(() => makeQueryClient());

  useEffect(() => {
    let cancelled = false;
    const detachBookingDraftPersistence = attachBookingDraftPersistence(store);

    configureApiAuthHandlers({
      onUnauthorized: () => {
        store.dispatch(clearAuth());
      },
    });

    async function bootstrapAuth(): Promise<void> {
      store.dispatch(setAuthLoading());
      try {
        await ensureMocksInitialized();
        const user = await getMe();
        if (!cancelled) {
          store.dispatch(setAuthUser(user));
        }
      } catch {
        if (!cancelled) {
          store.dispatch(clearAuth());
        }
      }
    }

    void bootstrapAuth();

    return () => {
      cancelled = true;
      detachBookingDraftPersistence();
      configureApiAuthHandlers({});
    };
  }, [store]);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>{children}</AntdProvider>
        {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </Provider>
  );
}
