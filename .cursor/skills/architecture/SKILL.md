---
name: architecture
description: Use when designing or changing OpsPilot architecture, monorepo boundaries, applications, packages, infrastructure, or cross-cutting technical decisions.
---

# OpsPilot Architecture

## Repository assumptions
OpsPilot currently uses:
- Bun
- Turborepo
- TypeScript
- apps/web
- apps/docs
- packages/

Inspect the repository before assuming additional applications, frameworks, or packages.

## Architecture principles
1. Prefer the simplest architecture that supports current product requirements.
2. Keep domain logic independent from UI frameworks.
3. Keep application-specific code inside its application.
4. Put shared code in packages only when it has genuine reuse.
5. Avoid circular dependencies.
6. Avoid "utils" packages becoming dumping grounds.
7. Keep public package APIs intentional.
8. Make boundaries obvious to a new engineer.

## Monorepo rules
Before adding a package:
- Search for existing functionality.
- Confirm at least two consumers or a clear architectural reason.
- Check workspace dependencies.
- Check Turborepo task implications.
- Keep package ownership clear.

Never duplicate a dependency in multiple places without understanding workspace behavior.

## Web/backend/mobile boundaries
Treat these as separate delivery surfaces:
- web UI
- backend/API
- mobile client when introduced
- shared domain/types where genuinely appropriate

Do not leak server-only code into browser/mobile bundles.

## Backend architecture
If/when the backend is NestJS:
- controllers handle transport concerns
- services/use-cases handle application behavior
- domain logic should remain testable
- persistence concerns stay behind appropriate boundaries
- DTOs represent external contracts
- validation occurs at boundaries
- authorization is explicit

Do not create elaborate DDD layers unless domain complexity requires them.

## Data and API contracts
Changes to API or shared types must consider:
- existing consumers
- backward compatibility
- validation
- error contracts
- pagination
- authorization
- migration requirements

## Architectural decision process
Before a significant change:
1. Describe the current architecture.
2. Identify the problem with it.
3. Present the smallest viable change.
4. Identify alternatives.
5. Explain trade-offs.
6. Implement only the justified approach.

## Quality bar
Production architecture should optimize for:
- correctness
- maintainability
- observability
- security
- predictable failure
- incremental scalability

Do not optimize for theoretical scale before real usage requires it.
