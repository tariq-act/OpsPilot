# OpsPilot Context

## Project

OpsPilot is a multi-tenant field-service operations SaaS platform.

## Context Skills

Location: `.cursor/skills/opspilot/`

| Skill | Use for |
|-------|---------|
| `core` | Product, domain, users, roles |
| `current-state` | Latest implementation status (source of truth for progress) |
| `engineering` | Architecture, stack, coding rules |
| `ui-ux` | Frontend, design system, Figma/UI patterns |
| `project-management` | GitHub issues / project board workflow |
| `roadmap` | Planned features and phases |
| `decisions` | Architectural decision log |

## Context Loading Rule

Load only the skills relevant to the current task.

Always load:

- `core`
- `current-state`
- `engineering`

Load additional skills only when relevant:

| Task type | Also load |
|-----------|-----------|
| Backend | (engineering already loaded) |
| Frontend / UI | `ui-ux` |
| GitHub / project board | `project-management` |
| Planning / prioritization | `roadmap` |
| Architecture change | `decisions` |
| Figma / design | `core`, `current-state`, `ui-ux` |

## Important Rules

- Repository implementation is the source of truth.
- Do not assume roadmap items are implemented.
- Do not mark incomplete work as complete.
- Continue from `current-state` instead of restarting analysis.
- Inspect the repository before claiming something is implemented.
- Avoid unnecessary architectural changes.
- Preserve established decisions unless there is a strong technical reason to change them.
- Work incrementally.
- After completing meaningful implementation work, update `current-state`.
- Root `README.md` and `docs/ARCHITECTURE.md` are stale relative to the codebase; prefer skills + source.
