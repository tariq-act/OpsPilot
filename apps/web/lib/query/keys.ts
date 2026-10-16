/**
 * Domain-shaped query keys for OpsPilot server state.
 *
 * Hierarchy: domain → scope (organization when needed) → resource shape → filters.
 * Invalidate at the narrowest key that still covers the write.
 */

export const queryKeys = {
  organizations: {
    all: ["organizations"] as const,
    lists: () => [...queryKeys.organizations.all, "list"] as const,
    list: () => [...queryKeys.organizations.lists()] as const,
    members: (organizationId: string) =>
      [...queryKeys.organizations.all, organizationId, "members"] as const,
  },

  jobs: {
    all: (organizationId: string) => ["jobs", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.jobs.all(organizationId), "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.jobs.lists(organizationId)] as const,
  },

  serviceRequests: {
    all: (organizationId: string) =>
      ["service-requests", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.serviceRequests.all(organizationId), "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.serviceRequests.lists(organizationId)] as const,
  },

  technicians: {
    all: (organizationId: string) => ["technicians", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.technicians.all(organizationId), "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.technicians.lists(organizationId)] as const,
  },

  invoices: {
    all: (organizationId: string) => ["invoices", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.invoices.all(organizationId), "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.invoices.lists(organizationId)] as const,
  },

  auditLogs: {
    all: (organizationId: string) => ["audit-logs", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.auditLogs.all(organizationId), "list"] as const,
    list: (organizationId: string, limit: number) =>
      [...queryKeys.auditLogs.lists(organizationId), { limit }] as const,
  },
} as const;
