# Verify: audit logging · updated 2026-10-13

## Manual / Bruno

- [ ] As OWNER/ADMIN with `x-organization-id`, `GET /audit-logs` and `GET /audit-logs/:id` → 200
- [ ] As DISPATCHER or TECHNICIAN → 403 on both routes
- [ ] Filter by `action`, `entityType`, `actorUserId`, `fromDate`, `toDate`, `limit`, `offset`
- [ ] Create org / invite / change member role → audit rows with no email/token in metadata
- [ ] Create/update customer, service request, job schedule/assign/complete → audit rows
- [ ] Send/void invoice; record/refund payment → audit rows; void/payment use critical path
- [ ] Create/update/activate automation rule; force execution failure → system actor (`actorUserId` null) on failure
- [ ] Confirm no update/delete audit APIs exist

## Commands

- [ ] `cd apps/api && bun run build` → success
- [ ] Postgres: `\d audit_log` shows indexes on organization_id, created_at, action, entity fields
