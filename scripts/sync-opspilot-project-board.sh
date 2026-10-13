#!/usr/bin/env bash
set -euo pipefail

# Add the OpsPilot roadmap issues to the existing personal GitHub Project.
# Requires GitHub CLI authenticated with project/read:project scopes:
#   gh auth refresh -s project,read:project
#
# Usage from repo root:
#   bash scripts/sync-opspilot-project-board.sh
#
# Existing items may be reported as already added; that is safe to ignore.
OWNER="tariq-act"
PROJECT_NUMBER="1"
REPO="tariq-act/OpsPilot"

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

# Check required ProjectV2 permissions before attempting writes.
if ! gh project view "$PROJECT_NUMBER" --owner "$OWNER" >/dev/null 2>&1; then
  echo "Cannot read the project. Run: gh auth refresh -s project,read:project" >&2
  exit 1
fi

# Roadmap umbrella issues plus frontend/backend implementation slices.
ISSUES=(40 41 42 43 44 45 46 47 48 54 55 56 57 58 59 60 61
        62 63 64 65 66 67 68 69 70 71 72 73 74 75 76)

for number in "${ISSUES[@]}"; do
  url="https://github.com/${REPO}/issues/${number}"
  echo "Syncing issue #${number}..."
  if gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$url"; then
    echo "  Added."
  else
    echo "  Could not add (possibly already on the board); verify this item if needed."
  fi
done

echo
echo "Project: https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER}"
