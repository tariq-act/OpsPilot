"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { makeQueryClient } from "@/lib/query/client";

/**
 * Owns the QueryClient for the browser session.
 * Server entity data lives in the query cache, not React context.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools
          buttonPosition="bottom-left"
          initialIsOpen={false}
        />
      ) : null}
    </QueryClientProvider>
  );
}
