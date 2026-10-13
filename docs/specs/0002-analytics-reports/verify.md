# Verify: analytics reports · updated 2026-10-13

## Manual / Bruno

- [ ] As OWNER/ADMIN/DISPATCHER with `x-organization-id`, call all five `GET /analytics/*` routes → 200 with empty-safe zeros/empty arrays when no data
- [ ] As TECHNICIAN → 403 on each route
- [ ] Missing `x-organization-id` → 400; no session → 401
- [ ] `fromDate` after `toDate` → 400
- [ ] Overview `revenueCollected` matches sum of SUCCEEDED payments; `outstandingBalance` matches sum of amountDue on open invoices; `invoicedAmount` is not equal to revenue when unpaid invoices exist
- [ ] Jobs returns `byStatus` counts that sum to `total`; rates are 0 when no finished jobs
- [ ] Revenue `period=day|week|month` returns trend buckets; empty range → `trends: []`
- [ ] Technicians / customers honor `limit` and `offset` and return `total`

## Commands

- [ ] `cd apps/api && bun run build` → success
