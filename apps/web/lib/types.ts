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

export interface Job {
  id: string;
  organizationId: string;
  customerId: string;
  requestId: string;
  title: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobListResponse {
  jobs: Job[];
}

export interface ListJobsQuery {
  status?: JobStatus;
  customerId?: string;
  requestId?: string;
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

export type TechnicianStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Technician {
  id: string;
  organizationId: string;
  status: TechnicianStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianListResponse {
  technicians: Technician[];
}

export type InvoiceStatus =
  "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID";

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
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
