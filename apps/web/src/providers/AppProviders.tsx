"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureApiAuthHandlers } from "@/lib/api/client";
import { makeStore } from "@/store";
import { clearAuth } from "@/store/slices/authSlice";
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
    configureApiAuthHandlers({
      onUnauthorized: () => {
        store.dispatch(clearAuth());
      },
    });
    return () => {
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
