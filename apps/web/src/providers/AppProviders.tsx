"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureApiAuthHandlers, ensureMocksInitialized } from "@/lib/api/client";
import { getMe } from "@/lib/api/endpoints/auth";
import { makeStore } from "@/store";
import { attachBookingDraftPersistence } from "@/store/bookingDraftStorage";
import { useAppSelector } from "@/store/hooks";
import {
  clearAuth,
  selectIsAuthenticated,
  setAuthLoading,
  setAuthUser,
} from "@/store/slices/authSlice";
import { resetCall } from "@/store/slices/callSlice";
import { resetChat } from "@/store/slices/chatSlice";
import { AntdProvider } from "./AntdProvider";
import { SocketProvider } from "./SocketProvider";

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

function AuthenticatedSocketGate({ children }: Readonly<{ children: ReactNode }>) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);

  if (!isAuthenticated || userId === null) {
    return <>{children}</>;
  }

  return <SocketProvider key={userId}>{children}</SocketProvider>;
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
        store.dispatch(resetChat());
        store.dispatch(resetCall());
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
        <AntdProvider>
          <AuthenticatedSocketGate>{children}</AuthenticatedSocketGate>
        </AntdProvider>
        {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </Provider>
  );
}
