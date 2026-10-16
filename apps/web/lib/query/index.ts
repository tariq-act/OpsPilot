export { makeQueryClient } from "@/lib/query/client";
export { toQueryError } from "@/lib/query/errors";
export { queryKeys } from "@/lib/query/keys";
export {
  getServerQueryState,
  type ServerQueryState,
} from "@/lib/query/query-state";

export {
  organizationQueries,
  useCreateOrganizationMutation,
  useOrganizationMembersQuery,
  useOrganizationsQuery,
} from "@/lib/query/organizations";

export { jobQueries, useInvalidateJobs, useJobsQuery } from "@/lib/query/jobs";

export {
  serviceRequestQueries,
  useInvalidateServiceRequests,
  useServiceRequestsQuery,
} from "@/lib/query/service-requests";

export {
  technicianQueries,
  useInvalidateTechnicians,
  useTechniciansQuery,
} from "@/lib/query/technicians";

export {
  invoiceQueries,
  useInvalidateInvoices,
  useInvoicesQuery,
} from "@/lib/query/invoices";

export {
  auditLogQueries,
  useAuditLogsQuery,
  useInvalidateAuditLogs,
} from "@/lib/query/audit-logs";
