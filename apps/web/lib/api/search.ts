import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type { SearchResponse } from "@/lib/types";

export function searchOrganization(
  organizationId: string,
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  return api.get<SearchResponse>(`/search?${params}`, {
    headers: organizationHeaders(organizationId),
    signal,
  });
}
