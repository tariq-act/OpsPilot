---
name: frontend
description: Use when building or modifying OpsPilot web UI, React components, Next.js routes, forms, data fetching, UX states, accessibility, or frontend performance.
---

# OpsPilot Frontend Engineering

## Stack
The current repository includes a web application. Inspect its package.json and existing code before assuming exact Next.js, styling, state, or data-fetching libraries.

Use TypeScript throughout.

## Product UI principles
OpsPilot is an operational product. UI should help users:
- understand what is happening
- identify what needs attention
- understand why it matters
- take an appropriate action
- verify the result

Prioritize information hierarchy over decorative UI.

## Required states
Every data-driven workflow should consider:
- loading
- success
- empty
- validation error
- network/API error
- permission denied
- stale data
- retry/recovery

Never leave users with a blank screen or unexplained spinner.

## React architecture
Prefer:
- small cohesive components
- explicit props
- predictable state ownership
- reusable primitives
- feature-oriented organization
- server rendering where appropriate
- client components only when browser interactivity is required

Avoid:
- giant components
- deeply nested prop drilling when a clearer boundary exists
- unnecessary global state
- premature abstraction
- duplicated business rules

## Forms
Use the repository's existing form/validation conventions. Validate at the UI boundary for good UX, but never rely on client validation as the security boundary.

Handle:
- invalid input
- server validation errors
- submission progress
- duplicate submission
- recovery

## Operational actions
For actions that change operational state:
- clearly identify the action
- show impact when useful
- prevent accidental destructive actions
- show confirmation when appropriate
- display resulting state
- handle failures without losing user context

## Accessibility
Follow WCAG-oriented practices:
- semantic HTML
- keyboard navigation
- visible focus
- accessible labels
- correct headings
- sufficient interaction targets
- screen-reader-friendly status/error messaging

## Performance
Measure before optimizing. Pay attention to:
- unnecessary rerenders
- bundle size
- data waterfalls
- large tables
- excessive client JavaScript
- image loading
- expensive computations

Use pagination/virtualization for genuinely large operational datasets.

## Definition of done
A frontend feature is not complete until:
- responsive behavior is considered
- all important UI states exist
- errors are understandable
- accessibility is acceptable
- types are correct
- tests are added where appropriate
- existing behavior is not unintentionally broken
