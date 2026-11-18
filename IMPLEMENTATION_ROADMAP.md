# OpsPilot – Remaining Implementation Roadmap

> **Repository:** https://github.com/tariq-act/OpsPilot  
> **Document:** Remaining Implementation Roadmap  
> **Architecture:** Next.js + NestJS + Prisma + Supabase PostgreSQL  
> **Objective:** Complete the actual OpsPilot product using the existing repository foundation.

---

## 1. Purpose

This document defines the remaining implementation work required to transform OpsPilot into a fully functional AI-assisted Field Service Management (FSM) platform.

This roadmap intentionally excludes infrastructure and developer tooling that already exist in the repository.

### Existing Foundation – Not Included in This Roadmap

The following components are already present and should be reused:

- Bun and Turborepo monorepo.
- Next.js frontend application.
- NestJS backend application.
- Shared UI, ESLint and TypeScript packages.
- Prisma ORM and PostgreSQL configuration.
- Supabase PostgreSQL connectivity.
- Prisma migration tooling.
- API health and readiness endpoints.
- Environment configuration.
- Docker Compose configuration.
- API unit and E2E testing setup.
- GitHub Actions CI pipeline.
- Linting, type checking and production build checks.
- Existing architecture and feature documentation.
- Swagger/OpenAPI API documentation infrastructure.

Do not recreate or replace these components unless a specific technical limitation is identified.

---

# 2. Implementation Priorities

The remaining development should focus on:

1. Actual product database models and repositories.
2. Authentication and organization management.
3. Backend business modules.
4. Frontend-to-backend integration.
5. Customer and service management.
6. Job and work order management.
7. Technician management.
8. Scheduling and dispatch.
9. Invoicing and payments.
10. Notifications and communication.
11. Background processing and workflow automation.
12. AI-powered operations.
13. Business dashboards and analytics.
14. Production deployment and operational reliability.

---

# PHASE 1 – Product Database and Domain Layer

## 3. Implement Product Database Models

The existing Prisma configuration should be extended with actual business-domain models.

Do not replace the existing Prisma setup.

### 3.1 Organization

Implement business organization records.

Required fields:

- id
- name
- slug
- email
- phone
- address
- timezone
- currency
- status
- createdAt
- updatedAt

Requirements:

- Support multiple organizations.
- Each organization must have isolated business data.
- Support organization activation and deactivation.
- Support organization-level settings.

### 3.2 User and Membership

Implement user identity and organization membership.

Required fields:

- id
- externalAuthId
- name
- email
- avatar
- status
- createdAt
- updatedAt

Organization membership should contain:

- organizationId
- userId
- roleId
- status
- joinedAt

A user should be able to belong to multiple organizations if the product requires it.

### 3.3 Customer

Implement customer records.

Fields:

- id
- organizationId
- name
- email
- phone
- address
- city
- state
- postalCode
- notes
- status
- createdAt
- updatedAt

### 3.4 Service Catalog

Implement configurable services.

Fields:

- id
- organizationId
- name
- description
- category
- basePrice
- estimatedDuration
- requiredSkills
- status

### 3.5 Technician

Implement technician profiles.

Fields:

- id
- organizationId
- userId
- employeeCode
- skills
- certifications
- hourlyRate
- availabilityStatus
- serviceAreas
- workingHours
- createdAt
- updatedAt

### 3.6 Service Requests

Fields:

- id
- organizationId
- customerId
- serviceId
- description
- priority
- preferredDate
- serviceAddress
- status
- source
- createdAt
- updatedAt

### 3.7 Jobs

Fields:

- id
- organizationId
- requestId
- customerId
- serviceId
- jobNumber
- title
- description
- priority
- scheduledStart
- scheduledEnd
- actualStart
- actualEnd
- status
- estimatedCost
- finalCost
- createdAt
- updatedAt

### 3.8 Supporting Models

Implement:

- JobAssignment
- JobStatusHistory
- Schedule
- TechnicianAvailability
- TechnicianLeave
- Invoice
- InvoiceItem
- Payment
- Notification
- Attachment
- CustomerFeedback
- AuditLog

### Database Acceptance Criteria

- [ ] Product models are implemented.
- [ ] Relationships and foreign keys are defined.
- [ ] Organization ownership is enforced.
- [ ] Appropriate database indexes are added.
- [ ] Important status changes are recorded.
- [ ] Financial fields use safe numeric representations.
- [ ] Migrations preserve existing database data.
- [ ] Repositories and database services are implemented.

---

# PHASE 2 – Authentication and Organization Management

## 4. Implement Authentication

Build the actual authentication experience using an established authentication provider, such as Supabase Auth.

Reuse the existing Next.js and NestJS applications.

### Frontend Requirements

- [ ] Registration page.
- [ ] Login page.
- [ ] Forgot password page.
- [ ] Password reset page.
- [ ] Email verification flow.
- [ ] Logout functionality.
- [ ] Session persistence.
- [ ] Protected application routes.
- [ ] User profile page.
- [ ] Organization selection.

### Backend Requirements

- [ ] Authentication token validation.
- [ ] Current-user endpoint.
- [ ] User profile management.
- [ ] Organization membership validation.
- [ ] Authentication guards.
- [ ] Authorization guards.
- [ ] Session and identity handling.

### Suggested API

```http
GET    /api/v1/auth/me
PATCH  /api/v1/auth/profile
GET    /api/v1/auth/organizations
POST   /api/v1/auth/select-organization
```

The backend must independently validate authentication and permissions. Frontend route protection alone is insufficient.

## 5. Organization Management

Implement organization onboarding and management.

Features:

- [ ] Create organization.
- [ ] Edit organization details.
- [ ] Organization settings.
- [ ] Invite employees.
- [ ] Accept invitations.
- [ ] Remove employees.
- [ ] Assign employee roles.
- [ ] Manage organization membership.
- [ ] Switch between organizations.
- [ ] Configure business timezone and currency.

### Roles

| Role | Permissions |
|---|---|
| Owner | Complete organization control |
| Admin | Manage operations and employees |
| Dispatcher | Manage requests, jobs and schedules |
| Technician | Access assigned jobs |
| Accountant | Manage invoices and payments |
| Viewer | Read-only access |

### Acceptance Criteria

- Users can access only authorized organizations.
- Employees can be invited and removed.
- Permissions are checked by the backend.
- Cross-organization data access is prevented.

---

# PHASE 3 – Frontend and Backend Integration

## 6. Implement Frontend API Integration

Connect the existing Next.js application to the NestJS API.

The API documentation infrastructure already exists. Implement the actual data integration using it.

### Frontend Requirements

- [ ] Create a centralized API client.
- [ ] Configure the API base URL.
- [ ] Implement authentication token handling.
- [ ] Implement reusable API services.
- [ ] Implement request and response types.
- [ ] Implement API error handling.
- [ ] Implement loading states.
- [ ] Implement empty states.
- [ ] Implement pagination.
- [ ] Implement search and filtering.
- [ ] Implement form validation.
- [ ] Implement consistent notifications and error messages.

### Suggested Structure

```text
apps/web/
  features/
    auth/
    customers/
    services/
    requests/
    jobs/
    technicians/
    scheduling/
    dispatch/
    invoices/
    payments/
    reports/

  services/
    api-client.ts
    auth-service.ts

  hooks/
  components/
  lib/
```

### Acceptance Criteria

- Frontend pages consume real backend data.
- No business module depends on hardcoded mock data in production.
- API failures are handled consistently.
- User permissions determine available actions.
- Forms display server-side validation errors.

---

# PHASE 4 – Customer and Service Management

## 7. Customer Management

Implement the customer management interface and APIs.

### Features

- [ ] Customer listing.
- [ ] Create customer.
- [ ] Edit customer.
- [ ] Archive customer.
- [ ] Search customers.
- [ ] Filter customers.
- [ ] Customer details.
- [ ] Customer activity history.
- [ ] Customer service history.
- [ ] Customer invoices.
- [ ] Customer payment history.
- [ ] Customer notes.
- [ ] Customer import and export.

### Suggested API

```http
POST   /api/v1/customers
GET    /api/v1/customers
GET    /api/v1/customers/:id
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id
GET    /api/v1/customers/:id/history
GET    /api/v1/customers/:id/jobs
GET    /api/v1/customers/:id/invoices
```

### UI Pages

- Customers listing.
- Add customer.
- Edit customer.
- Customer details.
- Customer activity.

## 8. Service Catalog Management

Implement business service configuration.

Features:

- [ ] Create services.
- [ ] Edit services.
- [ ] Archive services.
- [ ] Service categories.
- [ ] Pricing configuration.
- [ ] Estimated service duration.
- [ ] Required technician skills.
- [ ] Service availability.
- [ ] Optional add-on services.

### Acceptance Criteria

- Each organization maintains its own service catalog.
- Services can be associated with requests and jobs.
- Pricing and duration are configurable.

---

# PHASE 5 – Service Requests and Job Management

## 9. Service Request Management

Implement the complete service request lifecycle.

### Features

- [ ] Create requests manually.
- [ ] Receive requests from customers.
- [ ] Record customer information.
- [ ] Select requested service.
- [ ] Record problem descriptions.
- [ ] Set request priority.
- [ ] Capture preferred dates.
- [ ] Upload supporting images.
- [ ] Assign request status.
- [ ] Approve requests.
- [ ] Reject requests.
- [ ] Convert requests into jobs.
- [ ] Maintain request activity history.

### Request Status

```text
NEW
REVIEWED
APPROVED
REJECTED
CONVERTED_TO_JOB
CANCELLED
```

### Suggested API

```http
POST   /api/v1/requests
GET    /api/v1/requests
GET    /api/v1/requests/:id
PATCH  /api/v1/requests/:id
POST   /api/v1/requests/:id/approve
POST   /api/v1/requests/:id/reject
POST   /api/v1/requests/:id/convert-to-job
```

## 10. Job Management

Implement complete work order management.

### Features

- [ ] Create jobs from approved requests.
- [ ] Create manual jobs.
- [ ] Generate unique job numbers.
- [ ] Associate customers and services.
- [ ] Set priority.
- [ ] Set scheduled dates.
- [ ] Set estimated duration.
- [ ] Assign technicians.
- [ ] Track job status.
- [ ] Add job notes.
- [ ] Upload photographs.
- [ ] Record materials used.
- [ ] Record actual completion time.
- [ ] Record work completion details.
- [ ] Generate invoices from jobs.
- [ ] Maintain job history.

### Job Status

```text
CREATED
SCHEDULED
ASSIGNED
IN_PROGRESS
ON_HOLD
COMPLETED
CANCELLED
INVOICED
CLOSED
```

### Suggested API

```http
POST   /api/v1/jobs
GET    /api/v1/jobs
GET    /api/v1/jobs/:id
PATCH  /api/v1/jobs/:id
POST   /api/v1/jobs/:id/assign
POST   /api/v1/jobs/:id/start
POST   /api/v1/jobs/:id/complete
POST   /api/v1/jobs/:id/cancel
GET    /api/v1/jobs/:id/history
```

### Acceptance Criteria

- Jobs can be created, assigned and completed.
- Invalid status transitions are rejected.
- Job history is maintained.
- Duplicate job creation is prevented.
- Job completion information is available for invoicing.

---

# PHASE 6 – Technician Management and Dispatch

## 11. Technician Management

Implement the technician administration module.

### Features

- [ ] Technician profiles.
- [ ] Employee identification.
- [ ] Skill management.
- [ ] Certification management.
- [ ] Availability management.
- [ ] Working hours.
- [ ] Leave management.
- [ ] Service area management.
- [ ] Assigned job history.
- [ ] Completed job history.
- [ ] Technician workload.
- [ ] Technician performance metrics.

### Technician Interface

Technicians should be able to access:

- Today's jobs.
- Upcoming jobs.
- Customer details.
- Job location.
- Job instructions.
- Assigned tasks.
- Job status.
- Work notes.
- Completion history.

## 12. Scheduling and Calendar

Implement a functional scheduling interface.

### Features

- [ ] Daily schedule.
- [ ] Weekly calendar.
- [ ] Monthly calendar.
- [ ] Technician-specific schedules.
- [ ] Drag-and-drop scheduling.
- [ ] Appointment rescheduling.
- [ ] Availability checks.
- [ ] Working-hour validation.
- [ ] Leave conflict detection.
- [ ] Schedule conflict detection.
- [ ] Travel-time buffers.
- [ ] Timezone-aware scheduling.

### Acceptance Criteria

- Dispatchers can schedule and reschedule jobs.
- Scheduling conflicts are identified.
- Technicians can see their schedules.
- Schedule updates are reflected across the application.

## 13. Intelligent Dispatch

Implement a technician recommendation engine.

### Technician Selection Factors

1. Required skills.
2. Availability.
3. Existing workload.
4. Service location.
5. Travel distance.
6. Job priority.
7. Estimated job duration.

### Implementation

Start with a deterministic scoring algorithm.

Example:

```text
Technician Eligibility
       |
       v
Skill Validation
       |
       v
Availability Validation
       |
       v
Schedule Conflict Check
       |
       v
Distance Calculation
       |
       v
Workload Evaluation
       |
       v
Technician Ranking
       |
       v
Manager Approval
       |
       v
Job Assignment
```

### Features

- [ ] Eligible technician identification.
- [ ] Technician ranking.
- [ ] Assignment recommendations.
- [ ] Recommendation explanations.
- [ ] Manual override.
- [ ] Workload balancing.
- [ ] Reassignment suggestions.
- [ ] Assignment history.

### Acceptance Criteria

- Technicians without required skills are excluded.
- Unavailable technicians are excluded.
- Recommendations are explainable.
- Managers can override suggestions.

---

# PHASE 7 – Technician Mobile Experience

## 14. Technician PWA

Implement a responsive Progressive Web App for field technicians.

A separate native mobile application is not required initially.

### Features

- [ ] Mobile authentication.
- [ ] Assigned job list.
- [ ] Today's schedule.
- [ ] Job details.
- [ ] Customer contact.
- [ ] Map navigation.
- [ ] Start job.
- [ ] Pause job.
- [ ] Resume job.
- [ ] Complete job.
- [ ] Work notes.
- [ ] Upload photographs.
- [ ] Materials used.
- [ ] Customer signature.
- [ ] Completion confirmation.
- [ ] Offline job data.
- [ ] Offline update synchronization.

### Job Execution

```text
Assigned Job
     |
     v
View Customer Details
     |
     v
Navigate to Location
     |
     v
Start Job
     |
     v
Perform Service
     |
     v
Upload Work Evidence
     |
     v
Record Materials
     |
     v
Customer Confirmation
     |
     v
Complete Job
```

### Acceptance Criteria

- Technicians can complete assigned jobs using mobile devices.
- Job updates are persisted.
- Offline updates synchronize without duplicate operations.
- Customer confirmation is recorded.

---

# PHASE 8 – Invoicing and Payments

## 15. Invoice Management

Implement the invoicing module.

### Features

- [ ] Generate invoices from completed jobs.
- [ ] Create manual invoices.
- [ ] Generate unique invoice numbers.
- [ ] Add invoice items.
- [ ] Calculate subtotal.
- [ ] Calculate discounts.
- [ ] Calculate taxes.
- [ ] Calculate total.
- [ ] Set payment due dates.
- [ ] Generate PDF invoices.
- [ ] Send invoices to customers.
- [ ] Track invoice status.
- [ ] Support partial payments.
- [ ] Record credit notes where needed.

### Invoice Status

```text
DRAFT
SENT
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
```

### India-Specific Improvements

- GSTIN information.
- CGST, SGST and IGST configuration.
- HSN/SAC fields where applicable.
- INR currency.
- GST-ready PDF invoices.
- Configurable invoice numbering.

## 16. Payment Processing

Implement payment recording and gateway integration.

### Features

- [ ] Manual payment recording.
- [ ] Payment gateway integration.
- [ ] UPI support.
- [ ] Card payments.
- [ ] Bank payment support.
- [ ] Payment transaction history.
- [ ] Partial payments.
- [ ] Refund handling.
- [ ] Failed payment handling.
- [ ] Payment reconciliation.
- [ ] Payment receipts.

### Suggested Provider

Razorpay or another suitable payment gateway.

### Critical Requirements

- Verify payment webhooks.
- Prevent duplicate transactions.
- Validate payment amounts.
- Maintain transaction references.
- Reconcile payment records with invoices.
- Never store raw card details.

---

# PHASE 9 – Notifications and Communication

## 17. Notification Service

Implement communication triggered by business events.

### Channels

- Email.
- WhatsApp Business Platform.
- SMS.
- In-app notifications.

### Events

- New service request.
- Request approval.
- Job assignment.
- Appointment confirmation.
- Appointment rescheduling.
- Technician on the way.
- Job completion.
- Invoice generated.
- Payment received.
- Payment reminder.

### Features

- [ ] Notification templates.
- [ ] Email integration.
- [ ] WhatsApp integration.
- [ ] SMS integration.
- [ ] In-app notification center.
- [ ] Notification history.
- [ ] Delivery status.
- [ ] Retry failed messages.
- [ ] Customer communication preferences.
- [ ] Consent management.

---

# PHASE 10 – Background Processing and Automation

## 18. Background Job Processing

Introduce a dedicated worker application for asynchronous tasks.

Use Redis and BullMQ or an equivalent queue system.

### Tasks

- [ ] Configure background worker.
- [ ] Implement queue registration.
- [ ] Implement retry policies.
- [ ] Implement scheduled jobs.
- [ ] Implement failed-job handling.
- [ ] Implement job execution logs.
- [ ] Implement queue monitoring.
- [ ] Implement idempotency controls.

### Background Tasks

- Invoice PDF generation.
- Email delivery.
- WhatsApp messages.
- Payment reminders.
- Scheduled reports.
- Appointment reminders.
- Automation execution.

## 19. Workflow Automation Engine

Build configurable workflows using triggers, conditions and actions.

### Example: Job Completion

```text
Trigger: Job Completed
       |
       v
Generate Invoice
       |
       v
Send Customer Notification
       |
       v
Update Business Dashboard
       |
       v
Record Execution
```

### Example: Overdue Invoice

```text
Daily Scheduled Trigger
       |
       v
Find Overdue Invoices
       |
       v
Check Payment Status
       |
       v
Send Payment Reminder
       |
       v
Record Notification
```

### Features

- [ ] Workflow definitions.
- [ ] Trigger management.
- [ ] Condition evaluation.
- [ ] Action execution.
- [ ] Scheduled triggers.
- [ ] Workflow activation and deactivation.
- [ ] Execution history.
- [ ] Retry and failure handling.
- [ ] Duplicate execution prevention.
- [ ] Workflow administration interface.

---

# PHASE 11 – AI Capabilities

## 20. AI Operations Assistant

Implement a natural-language assistant for business owners and managers.

### Example Questions

- How many jobs are scheduled today?
- Which jobs are overdue?
- Which technicians are available?
- Which invoices are unpaid?
- What was this week's revenue?
- Which customers have outstanding balances?
- Which technicians have the highest workload?

### Features

- [ ] Natural-language question processing.
- [ ] Organization-specific data retrieval.
- [ ] Permission-aware data access.
- [ ] Job summaries.
- [ ] Invoice summaries.
- [ ] Revenue insights.
- [ ] Technician workload analysis.
- [ ] Historical business analysis.
- [ ] Suggested operational actions.
- [ ] Conversation history.

### AI Processing Flow

```text
User Question
      |
      v
Intent Identification
      |
      v
Authentication and Authorization
      |
      v
Business Data Retrieval
      |
      v
AI Response Generation
      |
      v
Response Validation
      |
      v
Display Result
```

### Security Requirements

- AI must not access unauthorized organization data.
- AI must not execute arbitrary SQL.
- Business data retrieval must use controlled backend services.
- Sensitive information must be minimized.
- Destructive actions require explicit confirmation.
- AI-triggered actions must be audited.

## 21. AI Service Request Intake

Allow users to submit requests in natural language.

Example:

"My AC is leaking water and making unusual noise. I need someone tomorrow."

Extract:

- Service category.
- Problem description.
- Recommended priority.
- Preferred appointment date.
- Required technician skills.
- Missing information.

### Features

- [ ] Natural-language parsing.
- [ ] Structured field extraction.
- [ ] Service classification.
- [ ] Priority recommendation.
- [ ] Missing-information detection.
- [ ] Draft request creation.
- [ ] User confirmation.
- [ ] AI extraction history.

## 22. AI Technician Recommendations

Improve the initial dispatch engine using AI-assisted recommendations.

Consider:

- Technician skill compatibility.
- Historical job performance.
- Customer preferences.
- Travel distance.
- Job complexity.
- Current workload.

AI recommendations must respect mandatory eligibility and scheduling constraints.

The system should explain why a particular technician is recommended.

---

# PHASE 12 – Dashboard and Analytics

## 23. Operational Dashboard

Implement a dashboard using actual API data.

### KPI Cards

- Total jobs.
- Today's jobs.
- Jobs in progress.
- Completed jobs.
- Unassigned jobs.
- Pending requests.
- Available technicians.
- Outstanding invoices.
- Total revenue.

### Dashboard Components

- [ ] Job status overview.
- [ ] Daily job schedule.
- [ ] Technician workload.
- [ ] Recent service requests.
- [ ] Unassigned jobs.
- [ ] Overdue invoices.
- [ ] Revenue overview.
- [ ] Customer activity.
- [ ] Operational alerts.
- [ ] AI-generated insights.

## 24. Reporting and Analytics

Implement business reports.

### Reports

- Revenue by date.
- Revenue by service.
- Revenue by technician.
- Completed jobs.
- Cancelled jobs.
- Average job duration.
- Technician utilization.
- Customer retention.
- Outstanding payments.
- Invoice aging.

### Features

- [ ] Date-range filters.
- [ ] Service filters.
- [ ] Technician filters.
- [ ] CSV export.
- [ ] PDF export.
- [ ] Interactive charts.
- [ ] Scheduled reports.

---

# PHASE 13 – Customer Self-Service

## 25. Customer Portal

Implement a portal for customers.

### Features

- [ ] Customer registration.
- [ ] Customer login.
- [ ] Submit service requests.
- [ ] View request status.
- [ ] Book appointments.
- [ ] Reschedule appointments.
- [ ] View technician information.
- [ ] View job progress.
- [ ] View invoices.
- [ ] Pay invoices.
- [ ] Download receipts.
- [ ] View service history.
- [ ] Submit service feedback.

### Acceptance Criteria

- Customers can only access their own information.
- Service requests are connected to the correct organization.
- Appointment and payment statuses remain synchronized.
- Customer actions are auditable.

---

# PHASE 14 – Frontend Quality and User Experience

## 26. Complete Product UI

Replace remaining starter UI with actual operational screens.

### Required Screens

- [ ] Authentication pages.
- [ ] Organization onboarding.
- [ ] Business dashboard.
- [ ] Customer management.
- [ ] Service catalog.
- [ ] Service request management.
- [ ] Job management.
- [ ] Technician management.
- [ ] Scheduling calendar.
- [ ] Dispatch board.
- [ ] Invoice management.
- [ ] Payment management.
- [ ] Notification center.
- [ ] Automation management.
- [ ] AI assistant.
- [ ] Reports and analytics.
- [ ] Organization settings.

### UI Requirements

- Consistent navigation.
- Responsive layouts.
- Accessible forms.
- Reusable data tables.
- Search and filtering.
- Confirmation dialogs.
- Loading indicators.
- Error handling.
- Empty states.
- Mobile-friendly interfaces.
- Role-specific navigation.

---

# PHASE 15 – Testing and Production Readiness

## 27. Frontend Testing

The repository already has API testing infrastructure. Extend quality coverage to the frontend.

### Tasks

- [ ] Add frontend unit testing.
- [ ] Add React component testing.
- [ ] Add form validation tests.
- [ ] Add API client tests.
- [ ] Add frontend E2E tests.
- [ ] Add authentication flow tests.
- [ ] Add mobile responsiveness tests.

## 28. Backend Business Testing

Extend existing API testing to cover actual business workflows.

### Test Cases

- [ ] Organization access isolation.
- [ ] Customer CRUD.
- [ ] Service request lifecycle.
- [ ] Job creation.
- [ ] Job status transitions.
- [ ] Technician assignment.
- [ ] Scheduling conflicts.
- [ ] Invoice calculations.
- [ ] Payment processing.
- [ ] Payment webhook idempotency.
- [ ] Notification delivery.
- [ ] Automation execution.
- [ ] AI authorization boundaries.

## 29. Deployment and Production Operations

The existing CI pipeline should be extended with deployment capabilities.

### Tasks

- [ ] Configure staging deployment.
- [ ] Configure production deployment.
- [ ] Add deployment approvals.
- [ ] Add production environment secrets.
- [ ] Add migration deployment strategy.
- [ ] Add deployment rollback procedures.
- [ ] Add application error tracking.
- [ ] Add structured logging.
- [ ] Add API performance monitoring.
- [ ] Add background worker monitoring.
- [ ] Configure database backup and recovery.
- [ ] Add production health alerts.

---

# 30. Recommended Development Order

| Priority | Implementation | Level |
|---|---|---|
| P0 | Product database models | Critical |
| P0 | Authentication and organization management | Critical |
| P0 | Frontend API integration | Critical |
| P0 | Customer management | Critical |
| P0 | Service catalog | Critical |
| P0 | Service request management | Critical |
| P0 | Job management | Critical |
| P0 | Technician management | Critical |
| P0 | Scheduling and dispatch | Critical |
| P0 | Invoice management | Critical |
| P0 | Payment management | Critical |
| P1 | Technician mobile PWA | High |
| P1 | Notifications | High |
| P1 | Dashboard and reports | High |
| P1 | Background workers | High |
| P1 | Workflow automation | High |
| P2 | Customer portal | Medium |
| P2 | AI operations assistant | Medium |
| P2 | AI request intake | Medium |
| P2 | AI dispatch recommendations | Medium |
| P3 | Predictive analytics | Future |
| P3 | Advanced route optimization | Future |

---

# 31. Definition of Done

A new feature is complete only when:

- [ ] Database changes are implemented.
- [ ] Backend business logic is implemented.
- [ ] API validation is implemented.
- [ ] Authentication and authorization are enforced.
- [ ] Organization data isolation is verified.
- [ ] Frontend is connected to real API data.
- [ ] Loading and error states are implemented.
- [ ] Relevant automated tests pass.
- [ ] API documentation is updated.
- [ ] Audit history is maintained where appropriate.
- [ ] No critical security issues remain.
- [ ] Existing repository CI checks pass.
- [ ] Code is reviewed and merged.

---

# 32. Final Product Goal

OpsPilot should provide one connected operational workflow:

```text
Customer
   |
   v
Service Request
   |
   v
Job Creation
   |
   v
Technician Scheduling
   |
   v
Smart Dispatch
   |
   v
Field Service Execution
   |
   v
Job Completion
   |
   v
Invoice Generation
   |
   v
Payment Collection
   |
   v
Customer Feedback
   |
   v
Business Analytics
   |
   v
AI-Powered Optimization
```

The final goal is to enable small and medium-sized field-service businesses to manage their entire service lifecycle from a single platform.

**Development principle:** Reuse the existing repository foundation, implement the missing business functionality, and introduce AI only after the underlying operational workflows are reliable.

---

*This document defines proposed remaining work based on the repository's published architecture. Before creating implementation issues, verify each item against the latest source code and existing GitHub issues to avoid duplicating work already completed or in progress.*
