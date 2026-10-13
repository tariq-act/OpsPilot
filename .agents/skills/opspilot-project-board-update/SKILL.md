---
name: opspilot-project-board-update
description: Reconcile OpsPilot project context and GitHub roadmap when the user says "update project board".
---

# OpsPilot Project Board Update

## Trigger
Use this workflow whenever the user says **"update project board"** in an OpsPilot conversation, or asks to sync/update the OpsPilot roadmap.

## Sources to inspect
1. Retrieve available prior OpsPilot conversation/project context using the available ChatGPT project context and memory/retrieval tools. Do not assume every ChatGPT conversation is automatically searchable.
2. Inspect current GitHub issues and PRs in `tariq-act/OpsPilot`.
3. Inspect the personal GitHub Project: https://github.com/users/tariq-act/projects/1.
4. Inspect relevant repository docs, implementation, and recent merged PRs/commits to distinguish planned work from shipped work.

## Reconciliation procedure
1. Read existing issues before creating anything. Current roadmap includes completed foundation issues #29–#39, open roadmap issues #40–#48 and #54–#61, and closed duplicates #49–#53. Verify their current state rather than trusting this snapshot indefinitely.
2. Compare current code/PRs with acceptance criteria. Only mark work complete when evidence supports it; never infer completion from a chat message alone if repository state contradicts it.
3. Update existing issue descriptions/checklists or status where appropriate. Create new issues only for uncovered, actionable gaps. Avoid duplicate titles/scope.
4. Every new ticket should identify frontend, backend, infrastructure, or cross-cutting scope; include goal, dependencies, security/tenant considerations, and testable acceptance criteria.
5. Add issues to the existing Project board and set an appropriate status if the available GitHub Project API/CLI supports it. If project-board actions are not available in the connected GitHub tools, report that limitation explicitly and provide the exact `gh project item-add 1 --owner tariq-act --url <issue-url>` command for each issue not added. Never claim a board update succeeded without verifying it.
6. Report a concise changelog: completed items, issues created/updated, board changes, blockers, and links.

## Board and repo
- Repository: https://github.com/tariq-act/OpsPilot
- Project: https://github.com/users/tariq-act/projects/1
- Preferred workflow statuses: Backlog, Todo, In Progress, In Review, Done.

## Important access limitation
This instruction file is a reusable repository-level workflow, not a global ChatGPT trigger. ChatGPT can use it when the OpsPilot repository/project context is available and this instruction is retrieved. It cannot guarantee automatic access to every separate ChatGPT conversation or silently run when the phrase is typed in an unrelated chat. The user must invoke the phrase in an OpsPilot chat/project (or provide the repo/project link), and the available GitHub integration must support the requested write operations.
