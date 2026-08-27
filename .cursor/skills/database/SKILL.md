---
name: database
description: Use when designing, changing, querying, migrating, indexing, or optimizing OpsPilot persistence and operational data models.
---

# OpsPilot Database Engineering

## Core principle
The database must preserve operational truth and data integrity.

Prefer a clear normalized model first. Optimize only when evidence requires it.

## Before schema changes
1. Inspect existing schema and migrations.
2. Identify all consumers.
3. Understand existing relationships.
4. Determine whether historical/audit data is required.
5. Plan migration and rollback implications.

Never silently change existing semantics.

## Modeling
For each entity identify:
- identity
- ownership
- lifecycle
- relationships
- required fields
- nullable fields
- unique constraints
- indexes
- timestamps
- audit requirements

Use database constraints for invariants that must always hold.

## Operational data
OpsPilot may need to distinguish:
- current state
- historical events
- user actions
- automated actions
- recommendations
- execution results

Do not overwrite information that must later be audited.

## Multi-tenancy
Do not introduce multi-tenancy complexity unless product requirements require organizations/workspaces/accounts.

If multi-tenancy is required:
- define tenant ownership explicitly
- enforce tenant isolation
- test cross-tenant access
- include tenant-aware indexes where useful

## Query performance
For large operational datasets:
- paginate
- filter at the database
- index real query patterns
- avoid N+1 queries
- select only required fields
- inspect query plans when performance is questionable

Do not add indexes speculatively.

## Migrations
Migrations should be:
- deterministic
- reviewable
- safe for existing data
- deployable in production

For destructive changes, use staged migrations when necessary:
expand → migrate/backfill → switch → contract.

## Transactions
Use transactions when multiple writes must preserve a single business invariant.

Do not hold transactions open across slow external API calls.

## Data integrity
Prefer:
- foreign keys
- unique constraints
- check constraints where appropriate
- explicit state machines
- timestamps

Application validation complements but does not replace database integrity.

## Security
Never expose credentials or secrets through database records returned to clients.

Consider encryption/tokenization for sensitive data where required by the product.

## Definition of done
Database changes require:
- migration
- updated types/models
- affected query review
- indexes justified by access patterns
- tests for important invariants
- rollback/deployment considerations
