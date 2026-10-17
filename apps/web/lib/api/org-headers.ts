/** Shared org-scope header for NestJS resource routes. */
export function organizationHeaders(
  organizationId: string,
): Record<string, string> {
  return { "x-organization-id": organizationId };
}
