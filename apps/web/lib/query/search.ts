"use client";

import { useQuery } from "@tanstack/react-query";
import { searchOrganization } from "@/lib/api/search";
import { queryKeys } from "@/lib/query/keys";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_DEBOUNCE_MS = 300;

export function useGlobalSearchQuery(
  organizationId: string,
  membershipId: string,
  role: string,
  query: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.search.results(
      organizationId,
      membershipId,
      role,
      query,
    ),
    queryFn: ({ signal }) => searchOrganization(organizationId, query, signal),
    enabled:
      enabled &&
      Boolean(organizationId) &&
      query.length >= SEARCH_MIN_LENGTH &&
      query.length <= SEARCH_MAX_LENGTH,
    // Recheck permissions on each search, including revisited terms.
    staleTime: 0,
    gcTime: 0,
  });
}
