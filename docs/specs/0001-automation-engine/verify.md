# Verify: automation engine · spec 0001 · updated 2026-10-13

_Steps from the automation engine build. No ratified spec yet; these are the behaviors to exercise. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Sign in as an owner, admin, or dispatcher, send `x-organization-id`, create a rule, then list it, open it, update it, activate it, and deactivate it → each call stays inside that organization and returns the rule → AC-1
- [ ] Repeat those calls with another organization's id → not found. Repeat them as a technician → forbidden → AC-2
- [ ] Create a `JOB_COMPLETED` rule whose action is `SEND_PAYMENT_REMINDER` → validation error, rule is not stored → AC-3
- [ ] Create an active `JOB_COMPLETED` rule that creates an invoice, complete a matching job → one execution succeeds and one draft invoice exists. Complete or replay that same job event → no second execution and no second invoice → AC-4
- [ ] Create an active `INVOICE_SENT` rule, send an invoice → one execution. From a job completed rule, create an invoice only → sending is not started by the rule, and no nested rule runs → AC-5
- [ ] Record a succeeded payment against an `PAYMENT_RECEIVED` rule, and let a due follow up scan hit a `FOLLOW_UP_DUE` rule → each produces one execution. Run the scan again → the same follow up does not execute twice → AC-6
- [ ] Cause a transient failure while an execution runs → status returns to pending and retries, attempt count stays at or below 5, and the final status, error, and result are stored. A validation or permission failure is recorded as failed without further retries → AC-7
- [ ] Read an execution and the server log after a failure → input is operational ids, and neither the log nor the stored error contains a customer email, phone, or credential → AC-8

## Commands

- [ ] `cd apps/api && bun run build` → Nest build succeeds → AC-1
- [ ] In Postgres, `\d automation_rule` and `\d automation_execution` show both tables, the org idempotency unique key, and row level security enabled → AC-4

## Acceptance-criteria coverage

- AC-1 create, list, view, update, activate, deactivate · covered by the owner rule flow and the API build
- AC-2 organization isolation and owner, admin, dispatcher permissions · covered by the cross organization and technician checks
- AC-3 permitted trigger and action combinations · covered by the rejected payment reminder on job completed
- AC-4 async execution, idempotency, and invoice reuse · covered by the job completed invoice rule and the table check
- AC-5 no recursive triggering · covered by the invoice sent rule and the draft invoice that does not send itself
- AC-6 payment received and follow up due triggers · covered by the payment and due follow up flows
- AC-7 bounded retries and execution history · covered by the transient failure and the stored execution
- AC-8 safe failure logs · covered by the execution and log read
