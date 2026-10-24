/**
 * Shared API types that mirror the NestJS backend response DTOs.
 * Keep these in sync with apps/api/src when the API evolves.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export type MemberRole = "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN";
export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationListItem extends Organization {
  role: MemberRole;
  membershipStatus: MemberStatus;
  membershipId: string;
}

export interface OrganizationListResponse {
  organizations: OrganizationListItem[];
}

export interface MembershipSummary {
  id: string;
  role: MemberRole;
  status: MemberStatus;
}

export interface CreateOrganizationResponse {
  organization: Organization;
  membership: MembershipSummary;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
}

export interface MemberListResponse {
  members: Member[];
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: MemberRole;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInvitationResponse {
  invitation: Invitation;
}

export interface AcceptInvitationResponse {
  membership: {
    id: string;
    organizationId: string;
    userId: string;
    role: MemberRole;
    status: MemberStatus;
  };
  invitation: {
    id: string;
    status: InvitationStatus;
    acceptedAt: string | null;
  };
}

// ---------------------------------------------------------------------------
// API error shape (matches NestJS HttpException body)
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Dashboard resources
// Dates arrive as ISO strings from JSON. These shapes cover the fields the
// dashboard reads from the list endpoints.
// ---------------------------------------------------------------------------

export type JobStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type JobPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type JobAssignmentStatus =
  | "ASSIGNED"
  | "RELEASED"
  | "CANCELLED";

export interface Job {
  id: string;
  organizationId: string;
  customerId: string;
  requestId: string;
  title: string;
  description: string | null;
  priority: JobPriority;
  status: JobStatus;
  location: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedDuration: number | null;
  actualStart: string | null;
  actualEnd: string | null;
  completedAt: string | null;
  completionSummary: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobListResponse {
  jobs: Job[];
}

export interface JobResponse {
  job: Job;
}

export interface ListJobsQuery {
  status?: JobStatus;
  priority?: JobPriority;
  customerId?: string;
  requestId?: string;
  fromDate?: string;
  toDate?: string;
  technicianId?: string;
}

export interface CreateJobInput {
  customerId: string;
  requestId: string;
  title?: string;
  description?: string;
  priority?: JobPriority;
  location?: string;
  estimatedDuration?: number;
}

export interface UpdateJobInput {
  title?: string;
  description?: string | null;
  priority?: JobPriority;
  status?: JobStatus;
  location?: string | null;
  estimatedDuration?: number | null;
  actualStart?: string | null;
  actualEnd?: string | null;
}

export interface ScheduleJobInput {
  scheduledStart: string;
  scheduledEnd: string;
  location?: string;
  allowOverlap?: boolean;
}

export interface AssignTechniciansInput {
  technicianIds: string[];
  allowOverlap?: boolean;
}

export interface ReassignTechnicianInput {
  technicianId: string;
  allowOverlap?: boolean;
}

export interface UpdateAssignmentInput {
  status: "RELEASED" | "CANCELLED";
}

export interface UpdateJobProgressInput {
  status: "EN_ROUTE" | "ARRIVED" | "IN_PROGRESS";
  note?: string;
}

export interface CompleteJobInput {
  completionSummary: string;
  note?: string;
}

export interface JobAssignment {
  id: string;
  organizationId: string;
  jobId: string;
  technicianId: string;
  status: JobAssignmentStatus;
  assignedBy: string;
  assignedAt: string;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobAssignmentListResponse {
  assignments: JobAssignment[];
}

export interface JobAssignmentResponse {
  assignment: JobAssignment;
}

export interface AssignTechniciansResponse {
  job: Job;
  assignments: JobAssignment[];
}

export interface ReassignTechnicianResponse {
  job: Job;
  released: JobAssignment;
  assignment: JobAssignment;
}

export interface JobActivity {
  id: string;
  organizationId: string;
  jobId: string;
  action: string;
  fromStatus: JobStatus | null;
  toStatus: JobStatus | null;
  message: string | null;
  actorUserId: string;
  createdAt: string;
}

export interface JobActivityListResponse {
  activities: JobActivity[];
}

export type JobPhotoKind = "BEFORE" | "AFTER" | "OTHER";

export interface JobNote {
  id: string;
  organizationId: string;
  jobId: string;
  body: string;
  createdBy: string;
  createdAt: string;
}

export interface JobNoteListResponse {
  notes: JobNote[];
}

export interface JobNoteResponse {
  note: JobNote;
}

export interface CreateJobNoteInput {
  body: string;
}

export interface JobPhoto {
  id: string;
  organizationId: string;
  jobId: string;
  kind: JobPhotoKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface JobPhotoListResponse {
  photos: JobPhoto[];
}

export interface JobPhotoResponse {
  photo: JobPhoto;
}

export interface JobExecutionResponse {
  job: Job;
  notes: JobNote[];
  photos: JobPhoto[];
  activities: JobActivity[];
}

export type ServiceRequestStatus =
  "NEW" | "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type ServiceRequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ServiceRequestSource =
  "PHONE" | "EMAIL" | "WEBSITE" | "WALK_IN" | "WHATSAPP" | "OTHER";

export interface ServiceRequest {
  id: string;
  organizationId: string;
  customerId: string;
  title: string;
  description: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  source: ServiceRequestSource;
  preferredDate: string | null;
  preferredTime: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestListResponse {
  serviceRequests: ServiceRequest[];
}

export interface ServiceRequestResponse {
  serviceRequest: ServiceRequest;
}

export interface ListServiceRequestsQuery {
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateServiceRequestInput {
  customerId: string;
  title: string;
  description?: string;
  priority?: ServiceRequestPriority;
  source?: ServiceRequestSource;
  preferredDate?: string;
  preferredTime?: string;
}

export interface UpdateServiceRequestInput {
  title?: string;
  description?: string | null;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  source?: ServiceRequestSource;
  preferredDate?: string | null;
  preferredTime?: string | null;
}

export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  customers: Customer[];
}

export interface CustomerResponse {
  customer: Customer;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
}

export type TechnicianStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Technician {
  id: string;
  organizationId: string;
  userId: string;
  employeeCode: string;
  phone: string | null;
  bio: string | null;
  status: TechnicianStatus;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianListResponse {
  technicians: Technician[];
}

export interface TechnicianResponse {
  technician: Technician;
}

export interface ListTechniciansQuery {
  status?: TechnicianStatus;
}

export interface CreateTechnicianInput {
  userId: string;
  employeeCode?: string;
  phone?: string;
  bio?: string;
  hireDate?: string;
}

export interface UpdateTechnicianInput {
  employeeCode?: string;
  phone?: string | null;
  bio?: string | null;
  status?: TechnicianStatus;
  hireDate?: string | null;
}

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type InvoiceItemType = "LABOR" | "PARTS" | "OTHER" | "FEE";

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  type: InvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  jobId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  currency: string;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
}

export interface InvoiceListResponse {
  invoices: Invoice[];
}

export interface InvoiceResponse {
  invoice: Invoice;
}

export interface ListInvoicesQuery {
  status?: InvoiceStatus;
  customerId?: string;
  jobId?: string;
}

export interface CreateInvoiceItemInput {
  type: InvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface CreateInvoiceInput {
  customerId: string;
  jobId: string;
  items: CreateInvoiceItemInput[];
  discount?: string;
  tax?: string;
  dueAt?: string;
}

export interface UpdateInvoiceInput {
  items?: CreateInvoiceItemInput[];
  discount?: string;
  tax?: string;
  dueAt?: string | null;
}

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "UPI"
  | "ONLINE"
  | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED";

export interface Payment {
  id: string;
  organizationId: string;
  customerId: string;
  invoiceId: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListResponse {
  payments: Payment[];
}

export interface PaymentResponse {
  payment: Payment;
}

export interface CreatePaymentInput {
  amount: string;
  method: PaymentMethod;
  transactionId?: string;
  customerId?: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface AuditLogListResponse {
  auditLogs: AuditLog[];
}

// ---------------------------------------------------------------------------
// Customer notifications (outbound delivery history)
// ---------------------------------------------------------------------------

export type NotificationEventType =
  | "JOB_SCHEDULED"
  | "JOB_RESCHEDULED"
  | "TECHNICIAN_ASSIGNED"
  | "JOB_COMPLETED"
  | "INVOICE_SENT"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REMINDER"
  | "FOLLOW_UP_DUE";

export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP";

export type NotificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED";

export interface CustomerNotification {
  id: string;
  organizationId: string;
  customerId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  attemptCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: CustomerNotification[];
}

export interface NotificationResponse {
  notification: CustomerNotification;
}

export interface ListNotificationsQuery {
  status?: NotificationStatus;
  eventType?: NotificationEventType;
  channel?: NotificationChannel;
  customerId?: string;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export type FollowUpType = "FEEDBACK" | "MAINTENANCE_REMINDER";

export type FollowUpStatus =
  | "PENDING"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export interface FollowUp {
  id: string;
  organizationId: string;
  customerId: string;
  jobId: string | null;
  type: FollowUpType;
  status: FollowUpStatus;
  dueAt: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpListResponse {
  followUps: FollowUp[];
}

export interface FollowUpResponse {
  followUp: FollowUp;
}

export interface ListFollowUpsQuery {
  status?: FollowUpStatus;
  type?: FollowUpType;
  customerId?: string;
  jobId?: string;
}

export interface CreateFollowUpInput {
  customerId: string;
  jobId?: string;
  type: FollowUpType;
  dueAt: string;
  notes?: string;
}

export interface UpdateFollowUpInput {
  status?: FollowUpStatus;
  dueAt?: string;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type RevenueTrendPeriod = "day" | "week" | "month";

export interface AnalyticsDateRange {
  fromDate: string | null;
  toDate: string | null;
}

export interface AnalyticsDateRangeQuery {
  fromDate?: string;
  toDate?: string;
}

export interface AnalyticsPageQuery extends AnalyticsDateRangeQuery {
  limit?: number;
  offset?: number;
}

export interface AnalyticsOverview {
  totalCustomers: number;
  openRequests: number;
  activeJobs: number;
  completedJobs: number;
  outstandingInvoices: number;
  revenueCollected: string;
  invoicedAmount: string;
  outstandingBalance: string;
  currency: string | null;
  range: AnalyticsDateRange;
}

export interface AnalyticsOverviewResponse {
  overview: AnalyticsOverview;
}

export interface JobStatusCount {
  status: string;
  count: number;
}

export interface AnalyticsJobs {
  byStatus: JobStatusCount[];
  total: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  cancellationRate: number;
  range: AnalyticsDateRange;
}

export interface AnalyticsJobsResponse {
  jobs: AnalyticsJobs;
}

export interface RevenueTrendPoint {
  periodStart: string;
  amount: string;
  paymentCount: number;
}

export interface AnalyticsRevenue {
  paymentsReceived: string;
  paymentCount: number;
  outstandingBalance: string;
  invoicedAmount: string;
  period: RevenueTrendPeriod;
  trends: RevenueTrendPoint[];
  currency: string | null;
  range: AnalyticsDateRange;
}

export interface AnalyticsRevenueResponse {
  revenue: AnalyticsRevenue;
}

export interface ListAnalyticsRevenueQuery extends AnalyticsDateRangeQuery {
  period?: RevenueTrendPeriod;
}

export interface TechnicianWorkload {
  technicianId: string;
  employeeCode: string;
  status: string;
  userId: string;
  assignedJobs: number;
  completedJobs: number;
  activeJobs: number;
}

export interface AnalyticsTechnicians {
  technicians: TechnicianWorkload[];
  total: number;
  limit: number;
  offset: number;
  range: AnalyticsDateRange;
}

export interface AnalyticsTechniciansResponse {
  technicians: AnalyticsTechnicians;
}

export interface CustomerActivity {
  customerId: string;
  name: string;
  status: string;
  serviceRequestCount: number;
  completedJobCount: number;
  createdAt: string;
}

export interface AnalyticsCustomers {
  newCustomers: number;
  repeatCustomers: number;
  serviceRequestCount: number;
  customersWithCompletedJobs: number;
  customers: CustomerActivity[];
  total: number;
  limit: number;
  offset: number;
  range: AnalyticsDateRange;
}

export interface AnalyticsCustomersResponse {
  customers: AnalyticsCustomers;
}

// ---------------------------------------------------------------------------
// Automation rules
// ---------------------------------------------------------------------------

export type AutomationTrigger =
  | "JOB_COMPLETED"
  | "INVOICE_SENT"
  | "PAYMENT_RECEIVED"
  | "FOLLOW_UP_DUE";

export type AutomationActionType =
  | "CREATE_INVOICE"
  | "SEND_NOTIFICATION"
  | "SCHEDULE_FOLLOW_UP"
  | "SEND_PAYMENT_REMINDER";

export type AutomationExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export type AutomationConditionOperator = "eq" | "neq";

export type AutomationConditionMatch = "all" | "any";

export type AutomationConditionField =
  | "customerId"
  | "jobId"
  | "invoiceId"
  | "paymentId"
  | "followUpId"
  | "followUpType"
  | "currency"
  | "method";

export interface AutomationConditionRule {
  field: AutomationConditionField | string;
  operator: AutomationConditionOperator;
  value: string;
}

export interface AutomationConditions {
  match: AutomationConditionMatch;
  rules: AutomationConditionRule[];
}

export interface AutomationActionItem {
  type: InvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface AutomationAction {
  type: AutomationActionType;
  items?: AutomationActionItem[];
  discount?: string;
  tax?: string;
  dueInDays?: number;
  channel?: NotificationChannel;
  followUpType?: FollowUpType;
  notes?: string;
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  triggerEvent: AutomationTrigger;
  conditions: AutomationConditions;
  actions: AutomationAction[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRuleListResponse {
  rules: AutomationRule[];
}

export interface AutomationRuleResponse {
  rule: AutomationRule;
}

export interface ListAutomationRulesQuery {
  triggerEvent?: AutomationTrigger;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateAutomationRuleInput {
  name: string;
  description?: string;
  triggerEvent: AutomationTrigger;
  conditions: AutomationConditions;
  actions: AutomationAction[];
  isActive?: boolean;
}

export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string | null;
  triggerEvent?: AutomationTrigger;
  conditions?: AutomationConditions;
  actions?: AutomationAction[];
}

export interface AutomationExecutionInput {
  triggerEvent: AutomationTrigger;
  eventId: string;
  customerId: string | null;
  jobId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  followUpId: string | null;
  followUpType: string | null;
  currency: string | null;
  method: string | null;
}

export interface AutomationExecutionActionResult {
  index: number;
  type: string;
  status: "SUCCEEDED";
  output: Record<string, string>;
}

export interface AutomationExecutionResult {
  outcome?: "completed" | "closed";
  actions: AutomationExecutionActionResult[];
}

export interface AutomationExecution {
  id: string;
  organizationId: string;
  ruleId: string;
  eventId: string;
  status: AutomationExecutionStatus;
  input: AutomationExecutionInput;
  result: AutomationExecutionResult | null;
  error: string | null;
  idempotencyKey: string;
  attemptCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecutionListResponse {
  executions: AutomationExecution[];
}

export interface ListAutomationExecutionsQuery {
  status?: AutomationExecutionStatus;
  limit?: number;
  offset?: number;
}
