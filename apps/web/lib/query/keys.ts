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

  customers: {
    all: (organizationId: string) => ["customers", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.customers.all(organizationId), "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.customers.lists(organizationId)] as const,
    detail: (organizationId: string, customerId: string) =>
      [
        ...queryKeys.customers.all(organizationId),
        "detail",
        customerId,
      ] as const,
  },

  jobs: {
    all: (organizationId: string) => ["jobs", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.jobs.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.jobs.lists(organizationId), filters] as const,
  },

  serviceRequests: {
    all: (organizationId: string) =>
      ["service-requests", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.serviceRequests.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.serviceRequests.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.serviceRequests.all(organizationId), "detail", id] as const,
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
    list: (
      organizationId: string,
      filters: Record<string, string | number | undefined>,
    ) => [...queryKeys.auditLogs.lists(organizationId), filters] as const,
  },
} as const;
