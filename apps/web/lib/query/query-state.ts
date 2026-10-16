import type { QueryStatus } from "@tanstack/react-query";

import { toQueryError, type QueryErrorInfo } from "@/lib/query/errors";

/**
 * Normalized view of a TanStack Query result for operational UI states.
 * Server data stays in the query cache; this only derives flags for rendering.
 */
export type ServerQueryState<T> = {
  status: QueryStatus;
  data: T | undefined;
  error: QueryErrorInfo | null;
  /** First load with no cached data yet. */
  isLoading: boolean;
  /** Background refetch while cached data is shown. */
  isFetching: boolean;
  /** Cached data exists but is past staleTime. */
  isStale: boolean;
  /** Success with no items (caller defines emptiness). */
  isEmpty: boolean;
  isError: boolean;
  isSuccess: boolean;
};

export function getServerQueryState<T>(
  query: {
    status: QueryStatus;
    data: T | undefined;
    error: Error | null;
    isPending: boolean;
    isFetching: boolean;
    isStale: boolean;
    isError: boolean;
    isSuccess: boolean;
  },
  isEmptyValue: (data: T) => boolean = () => false,
): ServerQueryState<T> {
  const data = query.data;
  const hasData = data !== undefined;

  return {
    status: query.status,
    data,
    error: query.error ? toQueryError(query.error) : null,
    isLoading: query.isPending && !hasData,
    isFetching: query.isFetching,
    isStale: query.isStale && hasData,
    isEmpty: query.isSuccess && hasData && isEmptyValue(data),
    isError: query.isError,
    isSuccess: query.isSuccess,
  };
}
