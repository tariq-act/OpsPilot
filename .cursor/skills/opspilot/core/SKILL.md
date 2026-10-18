---
name: opspilot-core
description: OpsPilot product domain, users, roles, and organization model. Load for any OpsPilot task.
---

# OpsPilot Core

## Product

OpsPilot is a SaaS platform for small field-service businesses.

Typical businesses:

- HVAC
- plumbing
- electrical
- appliance repair
- other mobile/service businesses

Primary operational lifecycle:

```text
Customer
→ Service Request
→ Job
→ Scheduling
→ Technician
→ Work
→ Completion
→ Invoice
→ Payment
→ Follow-up
```

## Internal Users

### OWNER

Controls the organization:

- organization settings
- team
- customers
- jobs
- scheduling
- invoices
- payments
- reporting

### ADMIN

Organization manager with broad operational and team control (implemented role; often grouped with OWNER for manager RBAC).

### DISPATCHER

Manages operational workflow:

- service requests
- jobs
- scheduling
- technician assignment
- customer communication
- job status

### TECHNICIAN

Performs field work:

- assigned jobs
- customer/job information
- job status
- work notes
- completion
- evidence/photos when supported

### CUSTOMER

Customer is **not** an internal organization member.

Customer-facing workflows may include:

- service requests
- appointment information
- job updates
- invoices
- payments
- follow-up communication

## Organization Model

OpsPilot is multi-tenant. Primary tenant boundary:

```text
Organization
```

Internal users belong to organizations through membership.

Implemented internal roles (schema enum):

```text
OWNER
ADMIN
DISPATCHER
TECHNICIAN
```

Member status values:

```text
ACTIVE
INVITED
SUSPENDED
```

Separate concepts (do not merge without an ADR):

1. Authentication identity (`user` / session)
2. Organization membership + role
3. Customer records
4. Technician profile (may link to a member)

Org-scoped API calls use session cookie + `x-organization-id`.

## Canonical Product Doc

Broader product vision: `OPSPILOT_FEATURES.md` (roadmap-level; not implementation status).
