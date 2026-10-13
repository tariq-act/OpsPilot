**Branch:** `feat/automation-engine`  
**Project:** OpsPilot  
**Scope:** Rule-based business event automation

## Review: Does this explain the code?

**Yes—as an implementation overview, architecture guide, and verification checklist.** It describes the major components, supported triggers and actions, data model, API routes, integrations, and known limitations.

However, this document is **not a substitute for the source code** and cannot prove that the implementation behaves exactly as described. This review is based on the supplied branch overview; the actual repository files were not independently inspected.

Before treating the feature as production-ready, verify these implementation details against the code and tests:

1. **Crash recovery:** Persisted `PENDING` executions must be re-enqueued after process restart. Recovering stale `RUNNING` rows alone does not recover work that was pending in a lost in-memory queue.
2. **Action-level idempotency:** A business action may succeed before the execution result is persisted. Retrying must not create duplicate invoices, follow-ups, or notifications.
3. **Execution claiming:** `claimAutomationExecution` should atomically claim only eligible `PENDING` rows so concurrent workers cannot execute the same record simultaneously.
4. **Organization isolation:** Rule reads, execution reads, event inputs, and action targets must be scoped to the correct organization. An `x-organization-id` header must not be treated as proof of membership by itself.
5. **Authorization identity:** Executing actions as `rule.createdBy` can fail if the creator is disabled, removed, or loses permissions. Confirm the intended behavior and error classification.
6. **Condition and action validation:** Validate allowed fields, operators, values, action payloads, and trigger/action combinations on the server.
7. **Loop prevention:** `AsyncLocalStorage` depth is an in-process safeguard. Confirm how it behaves across asynchronous boundaries and do not treat it as a distributed recursion guard.
8. **Failure handling:** Confirm that transient errors retry, permanent errors fail without unnecessary retries, and attempt limits are enforced consistently.
9. **Scheduler behavior:** Confirm that repeatedly scanning due follow-ups is bounded and that the event identifier used for idempotency is stable across scans.
10. **Sensitive data:** Ensure execution inputs, results, and errors do not expose email addresses, phone numbers, credentials, or other sensitive information.

The sections below document the design described in the supplied overview. Treat implementation-specific claims as requiring source/test verification.

---

## 1. Overview

The Automation Engine connects existing OpsPilot business events to configurable actions through rule-based automation.

Authorized organization members can create and manage automation rules that execute predefined actions when business events occur.

### Design constraints

- No visual automation editor.
- No BullMQ dependency; it is not currently configured.
- No external paid integrations.
- Reuse existing business services rather than reimplementing their logic.
- Preserve organization isolation and role-based access control.
- Prevent recursive event triggering and duplicate execution records.

## 2. Goals and Requirements

### Rule management

- Create, list, retrieve, and update automation rules.
- Activate and deactivate rules.
- Retrieve execution history for individual rules.

### Supported triggers

| Trigger | Description |
| --- | --- |
| `JOB_COMPLETED` | A job has been completed. |
| `INVOICE_SENT` | An invoice has been sent. |
| `PAYMENT_RECEIVED` | A payment has succeeded. |
| `FOLLOW_UP_DUE` | A follow-up has reached its due time. |

### Supported actions

| Action | Description |
| --- | --- |
| `CREATE_INVOICE` | Create a draft invoice. |
| `SEND_NOTIFICATION` | Send a notification through the existing notification service. |
| `SCHEDULE_FOLLOW_UP` | Schedule a follow-up through the existing follow-up service. |
| `SEND_PAYMENT_REMINDER` | Send a payment reminder through the existing notification service. |

### Execution requirements

- Asynchronous execution through an in-process queue.
- Organization isolation and `OWNER` / `ADMIN` / `DISPATCHER` RBAC.
- Idempotent execution creation.
- Bounded retries for eligible failures.
- Safe logging and sensitive-data redaction.
- Protection against infinite loops and recursive event triggering.
- Reuse existing invoice, notification, and follow-up business logic.

---

## 3. Architecture and Execution Flow

### 3.1 Business-event flow

```text
Domain mutation (job / invoice / payment)
    |
    v
Existing domain service and notification flow
    |
    v
AutomationIngressService.accept()
    |
    +--> Check automation depth
    +--> Find active rules for the trigger
    +--> Evaluate rule conditions
    +--> Insert execution if absent (idempotency key)
    +--> Enqueue execution ID
                |
                v
       AutomationQueueService
                |
                v
       AutomationWorkerService
                |
                v
       AutomationExecutorService.run()
                |
                +--> Claim execution: PENDING -> RUNNING
                +--> Load and validate rule
                +--> Execute actions in automation context
                +--> Persist outcome
                        |
                        +--> SUCCEEDED
                        +--> PENDING (eligible retry)
                        +--> FAILED
```

The overview describes ingress as being called after existing notification logic. Verify the precise ordering in each domain service, and ensure automation failures do not cause a successful domain mutation to be reported as failed.

### 3.2 Follow-up scheduling flow

```text
AutomationSchedulerService (approximately every 60 seconds)
    |
    v
Find due follow-ups
    |
    v
AutomationIngressService.accept()
    |
    v
Match active FOLLOW_UP_DUE rules
    |
    v
Create idempotent execution records
    |
    v
Enqueue executions
```

The scheduler also invokes stale-execution recovery.

### 3.3 Loop prevention

The engine uses `AsyncLocalStorage` to track automation execution depth.

- `runInsideAutomation()` sets the automation depth to `1`.
- `AutomationIngressService.accept()` skips events when `automationDepth() >= MAX_AUTOMATION_DEPTH`.
- `MAX_AUTOMATION_DEPTH` is currently `1`.

This prevents nested automation ingress in the same asynchronous context. It is not a distributed loop-prevention mechanism across separate processes.

`CREATE_INVOICE` creates a **draft** invoice and does not send it. Therefore, that action should not itself emit `INVOICE_SENT`.

---

## 4. Module Architecture

The module split is intended to avoid circular dependencies between domain modules and automation execution services.

| Module | File | Responsibility |
| --- | --- | --- |
| `AutomationCoreModule` | `apps/api/src/automation/automation-core.module.ts` | Rules API, ingress, queue, and core automation functionality. |
| `AutomationModule` | `apps/api/src/automation/automation.module.ts` | Full automation runtime, including executor, worker, and scheduler. |

### Dependency rules

**`AutomationCoreModule`**

- Contains the controller, rules CRUD service, ingress service, and queue.
- Does not import invoice or notification modules.
- Is imported by Jobs, Invoices, and Payments.
- Exposes `AutomationIngressService` to domain modules.

**`AutomationModule`**

- Imports `AutomationCoreModule`, Invoices, and Notifications.
- Provides the executor, worker, and scheduler.
- Is registered in `app.module.ts`.

Jobs, Invoices, and Payments should import only `AutomationCoreModule`, not the full `AutomationModule`.

---

## 5. Data Model

### 5.1 Schema location

`apps/api/src/db/schema/automation.ts`

### Enums

**`automation_trigger`**

```text
JOB_COMPLETED
INVOICE_SENT
PAYMENT_RECEIVED
FOLLOW_UP_DUE
```

**`automation_execution_status`**

```text
PENDING
RUNNING
SUCCEEDED
FAILED
```

### 5.2 `automation_rule`

Stores automation configuration and ownership.

| Field | Purpose |
| --- | --- |
| `organizationId` | Organization that owns the rule. |
| `name` | Rule name. |
| `description` | Optional description. |
| `triggerEvent` | Business event that activates the rule. |
| `conditions` | JSONB condition configuration. |
| `actions` | JSONB array of configured actions. |
| `isActive` | Whether the rule is enabled. |
| `createdBy` | User who created the rule. |
| Timestamps | Creation and update metadata. |

Example condition structure:

```json
{
  "match": "all",
  "rules": [
    {
      "field": "status",
      "operator": "equals",
      "value": "COMPLETED"
    }
  ]
}
```

This is illustrative. The actual supported fields, operators, and values are defined by the policy and validation implementation. The `match` field supports `all` and `any`.

RLS is enabled according to the supplied overview. Verify that policies are actually applied and that application queries also enforce tenant boundaries.

### 5.3 `automation_execution`

Tracks individual automation executions.

| Field | Purpose |
| --- | --- |
| `organizationId` | Organization associated with the execution. |
| `ruleId` | Associated automation rule. |
| `eventId` | Identifier of the triggering event. |
| `status` | Current execution status. |
| `input` | Operational identifiers required for execution. |
| `result` | Execution result. |
| `error` | Execution error information. |
| `idempotencyKey` | Key used to prevent duplicate execution records. |
| `attemptCount` | Number of execution attempts. |
| `startedAt` | Execution start time. |
| `completedAt` | Execution completion time. |
| Timestamps | Creation and update metadata. |

Data-integrity details in the supplied overview:

- Unique constraint on `(organization_id, idempotency_key)`.
- RLS enabled.
- Execution input should contain operational identifiers only, not customer email addresses or phone numbers.

### 5.4 Database migration

```text
apps/api/src/db/migrations/20261013074627_automation_engine/
```

The migration is described as creating the automation tables and enums, adding constraints and indexes, enabling RLS, and extending `notification_event_type` with `PAYMENT_REMINDER` and `FOLLOW_UP_DUE`. Verify the migration itself for the exact objects and policies created.

### 5.5 Database queries

Location: `apps/api/src/db/queries/automation.ts`

| Function | Responsibility |
| --- | --- |
| `createAutomationRule` | Create a rule. |
| `updateAutomationRuleInOrganization` | Update a rule within an organization. |
| `findAutomationRuleInOrganization` | Retrieve a rule within an organization. |
| `findAutomationRuleById` | Retrieve a rule by ID. |
| `listAutomationRulesForOrganization` | List organization rules. |
| `listActiveAutomationRulesByTrigger` | Find active rules matching a trigger. |
| `insertAutomationExecutionIfAbsent` | Insert an execution without duplicating its idempotency key. |
| `claimAutomationExecution` | Transition `PENDING` to `RUNNING` and increment the attempt count. |
| `saveAutomationExecutionProgress` | Persist execution progress. |
| `markAutomationExecutionSucceeded` | Mark execution as successful. |
| `markAutomationExecutionPending` | Return an execution to the pending state. |
| `markAutomationExecutionFailed` | Mark an execution as failed. |
| `listAutomationExecutionsForRule` | Retrieve execution history. |
| `releaseStaleRunningExecutions` | Recover stale executions or mark them failed. |
| `listDueFollowUpsForAutomation` | Retrieve due follow-ups for scheduler processing. |

Queries are exported through `apps/api/src/db/queries/index.ts`.

---

## 6. Application Code Map

### 6.1 Policy — `automation.policy.ts`

Responsibilities described in the overview:

- `PERMITTED_ACTIONS`: allowed actions for each trigger.
- `CONDITION_FIELDS`: permitted condition fields for each trigger.
- `ruleConfigError`: rule configuration validation.
- `actionShapeError`: action structure validation.
- `matchesConditions`: condition evaluation.
- `idempotencyKeyFor`: idempotency key generation.
- `retryDelayMs`: retry delay calculation.
- `isTransientFailure`: transient error classification.
- `safeClientMessage`: safe client-facing error messages.
- `redactSensitive`: sensitive-data redaction.

**Idempotency key format**

```text
{ruleId}:{trigger}:{eventId}
```

**Retry configuration**

```ts
MAX_AUTOMATION_ATTEMPTS = 5;
```

`retryDelayMs` determines retry timing; `isTransientFailure` determines whether an error is eligible for retry. Verify that the attempt limit is enforced consistently, including after recovery.

### 6.2 Permitted trigger/action combinations

| Trigger | Permitted actions |
| --- | --- |
| `JOB_COMPLETED` | `CREATE_INVOICE`, `SEND_NOTIFICATION`, `SCHEDULE_FOLLOW_UP` |
| `INVOICE_SENT` | `SEND_NOTIFICATION`, `SCHEDULE_FOLLOW_UP`, `SEND_PAYMENT_REMINDER` |
| `PAYMENT_RECEIVED` | `SEND_NOTIFICATION`, `SCHEDULE_FOLLOW_UP` |
| `FOLLOW_UP_DUE` | `SEND_NOTIFICATION`, `SEND_PAYMENT_REMINDER` |

### 6.3 Context — `automation.context.ts`

Uses `AsyncLocalStorage` to track automation execution depth.

- `runInsideAutomation()` establishes the automation context.
- Ingress checks the current depth before accepting an event.
- The maximum permitted depth is `1`.

### 6.4 Rules API

Files:

- `automation-rules.service.ts`
- `automation.controller.ts`

**Base path:** `/automation/rules`

**Authentication and authorization described in the overview:**

- Better Auth session cookie.
- `x-organization-id` request header.
- Roles: `OWNER`, `ADMIN`, `DISPATCHER`.

| Method | Endpoint | Operation |
| --- | --- | --- |
| `POST` | `/automation/rules` | Create a rule. |
| `GET` | `/automation/rules` | List rules. |
| `GET` | `/automation/rules/:id` | Retrieve a rule. |
| `PATCH` | `/automation/rules/:id` | Update a rule. |
| `POST` | `/automation/rules/:id/activate` | Activate a rule. |
| `POST` | `/automation/rules/:id/deactivate` | Deactivate a rule. |
| `GET` | `/automation/rules/:id/executions` | List rule executions. |

The service operations include `create`, `list`, `getById`, `update`, `setActive`, and `listExecutions`.

**Security note:** A request header is a tenant selector, not authorization evidence. The authenticated user's organization membership and role must be validated server-side.

### 6.5 DTOs

Location: `apps/api/src/automation/dto/`

| File | Purpose |
| --- | --- |
| `create-automation-rule.dto.ts` | Request validation and custom `AutomationRuleConfigConstraint` validation. |
| `update-automation-rule.dto.ts` | Partial rule updates. |
| `list-automation-query.dto.ts` | Query parameters for rule and execution listings. |
| `automation-response.dto.ts` | Swagger response schemas. |

### 6.6 Ingress — `automation-ingress.service.ts`

**`accept(input)`**

- Non-throwing entry point for domain callers.
- Catches automation errors so they do not propagate into the originating business operation.

**`acceptOrThrow(input)`**

- Checks automation execution depth.
- Validates event identifiers.
- Loads applicable active rules.
- Evaluates rule conditions.
- Inserts execution records idempotently.
- Enqueues eligible executions.

The exact error boundary should be verified: failures must be observable through safe logs/metrics even when they are intentionally swallowed.

### 6.7 Queue — `automation-queue.service.ts`

Implements an in-memory FIFO queue with delayed retry support.

Responsibilities:

- Enqueue automation execution IDs.
- Deduplicate IDs currently queued.
- Support delayed retries.
- Dispatch work to the registered queue handler.

The queue is intended to be replaceable with a durable queue such as BullMQ later.

**Current limitation:** queued work is not durably stored by the in-memory queue.

### 6.8 Worker — `automation-worker.service.ts`

On module initialization, the worker:

1. Registers the queue handler.
2. Connects queued work to `AutomationExecutorService.run()`.
3. Invokes `recoverStale()` to recover stale executions.

Verify whether `recoverStale()` also re-enqueues eligible `PENDING` executions or only repairs stale `RUNNING` records.

### 6.9 Executor — `automation-executor.service.ts`

Entry point:

```ts
run(executionId)
```

Execution lifecycle:

1. Claim the execution.
2. Load and validate the associated rule.
3. Fail if the rule is missing, inactive, or invalid.
4. Execute actions inside `runInsideAutomation()`.
5. Persist the outcome.
6. Retry eligible failures or mark the execution as failed.

#### Action implementations

| Action | Implementation |
| --- | --- |
| `CREATE_INVOICE` | Calls `InvoicesService.create` as `rule.createdBy`, creating a draft invoice. On conflict, uses the existing active invoice ID. |
| `SCHEDULE_FOLLOW_UP` | Calls `FollowUpsService.create` as `rule.createdBy`. |
| `SEND_NOTIFICATION` | Calls `CustomerNotificationsService.notifyFromEventOrThrow`. |
| `SEND_PAYMENT_REMINDER` | Calls `CustomerNotificationsService.notifyFromEventOrThrow`. |

Notification actions use this idempotency key format:

```text
automation:{executionId}:{index}
```

This distinguishes notification actions within an execution. Confirm that each downstream service enforces the key and that other action types also handle retries safely.

### 6.10 Scheduler — `automation-scheduler.service.ts`

Runs approximately every 60 seconds, with the first tick delayed by 5 seconds.

Responsibilities:

- Recover stale executions.
- Find due follow-ups.
- Submit `FOLLOW_UP_DUE` events through the automation ingress.

Idempotency prevents duplicate execution records for the same rule and event, provided the event identifier remains stable across scans.

---

## 7. Integration Hooks

The following existing files are described as modified to integrate the Automation Engine.

| File | Change |
| --- | --- |
| `app.module.ts` | Registers `AutomationModule`. |
| `jobs.module.ts` | Integrates the automation core module. |
| `jobs.service.ts` | Calls `automationIngress.accept` after the `JOB_COMPLETED` notification. |
| `invoices.module.ts` | Integrates the automation core module. |
| `invoices.service.ts` | Calls `automationIngress.accept` after the `INVOICE_SENT` notification. |
| `payments.module.ts` | Integrates the automation core module. |
| `payments.service.ts` | Calls `automationIngress.accept` after a successful payment notification. |
| `notifications.module.ts` | Exports `FollowUpsService`. |
| `customer-notification.ts` | Adds `PAYMENT_REMINDER` and `FOLLOW_UP_DUE` notification event types. |
| `notification-content.ts` | Adds templates for the new notification event types. |
| `list-notifications-query.dto.ts` | Allows the new event types in notification filters. |
| `db/schema/index.ts` | Exports the automation schema. |

### Payment event naming

The automation trigger and notification event intentionally use different names:

| Purpose | Event |
| --- | --- |
| Automation trigger | `PAYMENT_RECEIVED` |
| Notification event | `PAYMENT_CONFIRMED` |

Preserve this distinction when modifying integrations.

---

## 8. File Inventory

### Automation module

```text
apps/api/src/automation/
├── automation-core.module.ts
├── automation.module.ts
├── automation.controller.ts
├── automation-rules.service.ts
├── automation-ingress.service.ts
├── automation-queue.service.ts
├── automation-executor.service.ts
├── automation-worker.service.ts
├── automation-scheduler.service.ts
├── automation.policy.ts
├── automation.context.ts
└── dto/
    ├── create-automation-rule.dto.ts
    ├── update-automation-rule.dto.ts
    ├── list-automation-query.dto.ts
    └── automation-response.dto.ts
```

### Database

```text
apps/api/src/db/
├── schema/
│   └── automation.ts
├── queries/
│   └── automation.ts
└── migrations/
    └── 20261013074627_automation_engine/
```

### Verification documentation

```text
docs/specs/0001-automation-engine/
└── verify.md
```

---

## 9. Known Limitations and Risks

| # | Limitation | Impact |
| --- | --- | --- |
| 1 | In-process queue is not durable. | Queued `PENDING` executions may not be re-enqueued after a process crash. Stale `RUNNING` executions may be recovered, but that does not recover every lost queue item. |
| 2 | Follow-up scanning runs every minute. | Already-processed due follow-ups may be scanned repeatedly. Idempotency prevents duplicate execution records, but database work continues. |
| 3 | Actions execute as `rule.createdBy`. | If the creator is removed, demoted, or loses required permissions, executions may fail with authorization errors. |
| 4 | Online payments remain `PENDING`. | No `PAYMENT_RECEIVED` event is generated until the payment reaches a `SUCCEEDED` path. |
| 5 | The queue is not multi-process safe. | The implementation shares the limitations of the existing in-process notification queue. |
| 6 | Invoice creation produces drafts only. | An `INVOICE_SENT` rule requires the invoice to be sent separately through the existing API or workflow. |

### Recommended follow-up improvements

These are possible future improvements, not requirements for the current branch:

1. Introduce a durable queue when infrastructure is configured.
2. Ensure persisted pending executions are re-enqueued after process restarts.
3. Define a stable execution identity and explicit authorization behavior.
4. Reduce repeated scans of already-processed follow-ups.
5. Add distributed coordination if the API runs across multiple instances.
6. Emit `PAYMENT_RECEIVED` only after confirmed payment success.

---

## 10. Verification and Testing

### Verification guide

See:

```text
docs/specs/0001-automation-engine/verify.md
```

### Swagger

```text
http://localhost:3000/docs
```

Open the **Automation** section.

### Bruno API testing

Configure:

- A valid Better Auth session cookie.
- The `x-organization-id` header for an organization the authenticated user belongs to.

Exercise these endpoints:

1. Create an automation rule.
2. List automation rules.
3. Retrieve a rule by ID.
4. Update a rule.
5. Activate and deactivate a rule.
6. List executions for a rule.

### End-to-end verification

1. Create an active rule for `JOB_COMPLETED`.
2. Configure a supported action, such as `SEND_NOTIFICATION`.
3. Complete a job in the relevant organization.
4. Verify that the event reaches the automation ingress.
5. Verify that an execution record is created.
6. Verify that the queue processes the execution.
7. Confirm that the execution reaches `SUCCEEDED`.
8. Verify that the intended business action occurred.
9. Repeat the trigger where appropriate and confirm duplicate execution records are not created.
10. Test invalid configurations, inactive rules, authorization failures, transient failures, permanent failures, and retry limits.
11. Simulate a process restart and verify recovery of pending and running executions.
12. Test concurrent claims and confirm the same execution cannot be processed concurrently by multiple workers.
13. Test organization boundaries with users from different organizations.
