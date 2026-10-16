import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

/** Shared defaults for OpsPilot server state. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry(failureCount, error) {
          if (error instanceof ApiError) {
            if (
              error.isUnauthorized ||
              error.isForbidden ||
              error.isNotFound ||
              error.status === 400
            ) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
