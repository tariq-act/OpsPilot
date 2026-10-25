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
    detail: (organizationId: string, id: string) =>
      [...queryKeys.jobs.all(organizationId), "detail", id] as const,
    assignments: (organizationId: string, id: string) =>
      [...queryKeys.jobs.detail(organizationId, id), "assignments"] as const,
    activities: (organizationId: string, id: string) =>
      [...queryKeys.jobs.detail(organizationId, id), "activities"] as const,
    notes: (organizationId: string, id: string) =>
      [...queryKeys.jobs.detail(organizationId, id), "notes"] as const,
    photos: (organizationId: string, id: string) =>
      [...queryKeys.jobs.detail(organizationId, id), "photos"] as const,
    execution: (organizationId: string, id: string) =>
      [...queryKeys.jobs.detail(organizationId, id), "execution"] as const,
    photoContent: (organizationId: string, id: string, photoId: string) =>
      [
        ...queryKeys.jobs.photos(organizationId, id),
        "content",
        photoId,
      ] as const,
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
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.technicians.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.technicians.all(organizationId), "detail", id] as const,
  },

  invoices: {
    all: (organizationId: string) => ["invoices", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.invoices.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.invoices.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.invoices.all(organizationId), "detail", id] as const,
    payments: (organizationId: string, invoiceId: string) =>
      [
        ...queryKeys.invoices.detail(organizationId, invoiceId),
        "payments",
      ] as const,
  },

  auditLogs: {
    all: (organizationId: string) => ["audit-logs", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.auditLogs.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | number | undefined>,
    ) => [...queryKeys.auditLogs.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.auditLogs.all(organizationId), "detail", id] as const,
  },

  notifications: {
    all: (organizationId: string) =>
      ["notifications", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.notifications.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.notifications.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.notifications.all(organizationId), "detail", id] as const,
  },

  followUps: {
    all: (organizationId: string) => ["follow-ups", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.followUps.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.followUps.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.followUps.all(organizationId), "detail", id] as const,
  },

  analytics: {
    all: (organizationId: string) => ["analytics", organizationId] as const,
    overview: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) =>
      [...queryKeys.analytics.all(organizationId), "overview", filters] as const,
    jobs: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.analytics.all(organizationId), "jobs", filters] as const,
    revenue: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) =>
      [...queryKeys.analytics.all(organizationId), "revenue", filters] as const,
    technicians: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) =>
      [
        ...queryKeys.analytics.all(organizationId),
        "technicians",
        filters,
      ] as const,
    customers: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) =>
      [
        ...queryKeys.analytics.all(organizationId),
        "customers",
        filters,
      ] as const,
  },

  automation: {
    all: (organizationId: string) => ["automation", organizationId] as const,
    lists: (organizationId: string) =>
      [...queryKeys.automation.all(organizationId), "list"] as const,
    list: (
      organizationId: string,
      filters: Record<string, string | undefined> = {},
    ) => [...queryKeys.automation.lists(organizationId), filters] as const,
    detail: (organizationId: string, id: string) =>
      [...queryKeys.automation.all(organizationId), "detail", id] as const,
    executions: (
      organizationId: string,
      ruleId: string,
      filters: Record<string, string | undefined> = {},
    ) =>
      [
        ...queryKeys.automation.detail(organizationId, ruleId),
        "executions",
        filters,
      ] as const,
  },
} as const;
