---
name: backend
description: Use when implementing OpsPilot APIs, business logic, authentication, authorization, integrations, jobs, webhooks, or backend infrastructure.
---

# OpsPilot Backend Engineering

## Stack
The project is intended to use a TypeScript backend; if NestJS is present or introduced, follow its established module/controller/service conventions. Inspect the repository before assuming exact libraries.

## Boundary principle
Backend code is the source of truth for:
- authorization
- business rules
- validation enforcement
- operational state transitions
- audit-sensitive actions

Never trust client-side checks.

## API design
For every endpoint define:
- purpose
- authenticated actor
- authorization requirements
- request schema
- response schema
- validation
- errors
- side effects
- idempotency requirements
- audit requirements

Use consistent HTTP semantics and error responses.

## Business logic
Keep business rules out of controllers.

Prefer:
Controller → application/service logic → persistence/integration.

Business logic should be independently testable.

## Validation
Validate untrusted input at boundaries:
- body
- query parameters
- route parameters
- uploaded files
- webhook payloads
- external API responses

Treat external systems as untrusted.

## Authentication and authorization
Implement explicit authorization for every protected operation.

Use least privilege and clear roles/permissions.

Never rely on:
- hidden UI controls
- client-provided role claims
- object IDs alone

Prevent IDOR/BOLA-style access bugs by checking ownership/authorization server-side.

## Operational workflows
State transitions should be explicit and validated.

For important actions:
- record actor
- record timestamp
- record relevant before/after state when required
- make retries safe
- make failures observable

## Async work
Use background jobs/queues only when justified by:
- long-running work
- retry requirements
- scheduled work
- external integration processing
- notification delivery

Jobs should be idempotent and observable.

## Webhooks
Verify authenticity before processing.

Handle:
- duplicate delivery
- retries
- malformed payloads
- out-of-order events
- processing failures

## Errors
Return safe client-facing errors. Never leak:
- secrets
- stack traces
- internal database details
- sensitive provider responses

Log useful diagnostic context server-side.

## Observability
Important backend operations should provide structured logs and useful metrics/traces where the project infrastructure supports them.

## Definition of done
Before considering backend work complete:
- validation exists
- authorization exists
- failure paths are handled
- tests cover important business rules
- migrations are safe
- API contract is clear
- logs do not expose secrets
