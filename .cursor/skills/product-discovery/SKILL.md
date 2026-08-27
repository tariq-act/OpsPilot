---
name: product-discovery
description: Use when defining, refining, validating, or prioritizing OpsPilot product features, workflows, personas, MVP scope, or user outcomes.
---

# OpsPilot Product Discovery

## Purpose
Keep OpsPilot focused on a real operational problem and measurable user outcomes. Treat the product as production software, not an AI portfolio demo.

## Product context
OpsPilot is an operations-focused copilot intended to help teams understand operational work, surface issues, recommend or automate actions, and maintain human control over important decisions.

Do not invent a more specific business domain unless the repository documentation or product requirements establish it.

## Required reasoning
For every feature, establish:

Problem → User → Current workflow → Pain → Desired outcome → Feature → Technical implementation.

Before implementation:
1. Inspect README, docs, tickets, existing screens, and code.
2. Identify the affected user/persona.
3. State the operational problem being solved.
4. Explain why the feature is needed now.
5. Define the smallest useful MVP behavior.
6. Identify measurable success criteria.
7. Identify edge cases and failure states.
8. Reject features that do not improve a real workflow.

## MVP discipline
Prefer:
- one clear workflow
- simple, reliable automation
- observable outcomes
- incremental delivery

Avoid:
- speculative dashboards
- generic CRUD
- AI chat added without a job-to-be-done
- premature multi-tenancy
- unnecessary integrations
- features created only for portfolio appeal

## AI product rule
AI must have a defensible role. Ask:
- Why AI instead of deterministic code?
- What happens when the model is wrong?
- Can the user verify the result?
- What data is required?
- What is the fallback?
- What is the cost?

High-impact or irreversible actions require appropriate human confirmation unless requirements explicitly establish safe automation.

## Acceptance criteria
Translate product requirements into observable acceptance criteria covering:
- happy path
- validation
- empty state
- loading state
- failure state
- permissions
- auditability
- accessibility where applicable

## Output style
When proposing a feature, give:
1. User problem
2. User story
3. Workflow
4. MVP scope
5. Acceptance criteria
6. Out of scope
7. Dependencies
8. Risks
9. Success metric
