---
name: code-review
description: Use when reviewing OpsPilot changes, pull requests, feature implementations, architecture changes, or before declaring work production-ready.
---

# OpsPilot Code Review

## Review objective
Find real defects and risks before they reach users. Do not optimize for praise or stylistic preferences.

## Review order
Review in this order:

1. Product correctness
2. Security
3. Data integrity
4. Authorization
5. Reliability
6. API compatibility
7. Architecture
8. Performance
9. Accessibility
10. Testing
11. Maintainability
12. Style

## Product correctness
Check:
- Does implementation satisfy acceptance criteria?
- Does it solve the intended user problem?
- Are edge cases handled?
- Are operational state transitions correct?
- Are error states usable?

## Security
Check:
- authentication
- authorization
- tenant isolation if applicable
- input validation
- injection risks
- secrets
- sensitive data exposure
- file uploads
- rate limiting
- unsafe external integrations

## AI review
For AI-related changes check:
- Is AI genuinely necessary?
- Is model output validated?
- Can AI bypass authorization?
- Can prompt injection alter behavior?
- What happens on provider failure?
- Is the operation idempotent?
- Are high-impact actions controlled?
- Is cost/latency acceptable?
- Is there an evaluation strategy?

## Data review
Check:
- schema correctness
- migrations
- constraints
- transactions
- query performance
- N+1 queries
- historical/audit requirements

## Frontend review
Check:
- loading/error/empty states
- accessibility
- responsive behavior
- unnecessary client-side state
- type safety
- API error handling
- optimistic update correctness
- destructive action handling

## Backend review
Check:
- validation
- authorization
- business logic placement
- error contracts
- idempotency
- background jobs
- webhook handling
- logging
- observability

## Testing review
Tests should demonstrate behavior, not merely increase coverage.

Look for missing tests around:
- business rules
- authorization
- state transitions
- failure paths
- integration boundaries
- AI evaluation cases

## Severity
Classify findings:

CRITICAL — security/data-loss/system-integrity issue; must fix before release.

HIGH — serious correctness, authorization, reliability, or production issue; normally block merge.

MEDIUM — meaningful defect or maintainability risk; should fix.

LOW — minor issue with limited impact.

INFO — optional improvement, not a defect.

## Review output
For every finding provide:
- severity
- file/location
- problem
- impact
- recommended fix

Do not report hypothetical issues without a plausible failure path.

After findings, provide:
- What is good
- Blocking issues
- Non-blocking issues
- Missing tests
- Production-readiness assessment

Never declare code production-ready without checking requirements, tests, security, and failure behavior.
