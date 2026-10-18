---
name: opspilot-project-management
description: OpsPilot GitHub issues and project-board workflow. Load for ticket, PR, or board tasks.
---

# OpsPilot Project Management

## Board & repo

- Repository: https://github.com/tariq-act/OpsPilot
- Project: https://github.com/users/tariq-act/projects/1
- Board update skill: `.agents/skills/opspilot-project-board-update/SKILL.md`
- Trigger phrase: **update project board**

## Status lifecycle

Preferred project statuses:

```text
Backlog
→ Todo (Ready)
→ In Progress
→ In Review
→ Done
```

(Board skill also uses wording: Backlog, Todo, In Progress, In Review, Done.)

## Delivery lifecycle

```text
Feature
→ Ticket
→ Backend implementation
→ Frontend implementation
→ Integration
→ Tests
→ PR
→ Project board update
```

Not every ticket needs every step, but do not mark Done when only half the stack exists unless the ticket scope is explicitly backend-only or frontend-only.

## Ticket conventions

Observed title patterns:

- `[Backend] …`
- `[Frontend] …`
- `[Docs] …`
- Epic-style titles without prefix for broader work
- Historical `[DONE] …` titles on completed foundation issues

New tickets should include:

- Scope (frontend / backend / infra / cross-cutting)
- Goal
- Dependencies
- Tenant/security considerations
- Testable acceptance criteria

## Rules

1. Ticket status must reflect actual implementation in the repo.
2. Do not mark Done merely because some code exists; check acceptance criteria, integration, and (when required) tests.
3. PRs should reference tickets.
4. Meaningful implementation changes should update project tracking when asked (or when finishing a ticket).
5. Before creating tickets, inspect existing issues/PRs/board to avoid duplicates.
6. Preserve existing structure and naming; prefer updating open issues over opening near-duplicates.
7. Open issue ≠ incomplete: several older UI issues (#40–#46) may lag behind merged work—verify code before changing status.
8. If GitHub Project CLI cannot set status, report the limitation and provide `gh project item-add` / equivalent commands; never claim a board update without verification.

## PR / CI expectations

- CI: lint, check-types, build (`.github/workflows/ci.yml`)
- API unit/e2e steps exist but are commented out in CI
- PR labeler + dependency review workflows also run

## Related docs

- Product vision: `OPSPILOT_FEATURES.md`
- Specs / verify checklists: `docs/specs/`
- Reviews: `docs/reviews/`
