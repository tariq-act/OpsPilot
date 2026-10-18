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

export {
  jobQueries,
  useAssignTechniciansMutation,
  useCancelJobMutation,
  useCompleteJobMutation,
  useCreateJobMutation,
  useCreateJobNoteMutation,
  useInvalidateJobs,
  useJobActivitiesQuery,
  useJobAssignmentsQuery,
  useJobExecutionQuery,
  useJobNotesQuery,
  useJobPhotoContentQuery,
  useJobPhotosQuery,
  useJobQuery,
  useJobsQuery,
  useReassignTechnicianMutation,
  useScheduleJobMutation,
  useUpdateJobAssignmentMutation,
  useUpdateJobMutation,
  useUpdateJobProgressMutation,
  useUploadJobPhotoMutation,
} from "@/lib/query/jobs";

export {
  useDispatchDay,
  type DispatchDayData,
  type TechnicianDaySchedule,
} from "@/lib/query/dispatch";

export {
  customerQueries,
  useCreateCustomerMutation,
  useCustomerQuery,
  useCustomersQuery,
  useDeactivateCustomerMutation,
  useInvalidateCustomers,
  useUpdateCustomerMutation,
} from "@/lib/query/customers";

export {
  serviceRequestQueries,
  useCancelServiceRequestMutation,
  useCreateServiceRequestMutation,
  useInvalidateServiceRequests,
  useServiceRequestQuery,
  useServiceRequestsQuery,
  useUpdateServiceRequestMutation,
} from "@/lib/query/service-requests";

export {
  technicianQueries,
  useCreateTechnicianMutation,
  useDeactivateTechnicianMutation,
  useInvalidateTechnicians,
  useTechnicianQuery,
  useTechniciansQuery,
  useUpdateTechnicianMutation,
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
