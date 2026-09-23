#!/usr/bin/env bash
# Rebuilds the "test" branch from scratch: main + every branch listed in
# test-branch.manifest, in order. Recurring conflicts are auto-resolved via
# git rerere; conflicts with no cached resolution are skipped (not fatal),
# reported in TEST_STATUS.md, and flagged for the branch owner.
#
# Assumes: rerere is already enabled+configured with an autoUpdate cache
# (see workflow YAML for how the cache is restored before this runs).

set -euo pipefail

MANIFEST_FILE="test-branch.manifest"
TEST_BRANCH="test"
BASE_BRANCH="main"
SKIPPED_FILE="skipped.txt"   # consumed by the workflow to post PR comments

git config user.name "test-branch-bot"
git config user.email "test-branch-bot@users.noreply.github.com"
git config rerere.enabled true
git config rerere.autoUpdate true

git fetch origin --prune

if ! git cat-file -e "origin/$BASE_BRANCH:$MANIFEST_FILE" 2>/dev/null; then
  echo "$MANIFEST_FILE not found on $BASE_BRANCH yet - nothing to do."
  exit 0
fi

git show "origin/$BASE_BRANCH:$MANIFEST_FILE" \
  | grep -vE '^\s*#|^\s*$' > /tmp/manifest.txt || true

if [ ! -s /tmp/manifest.txt ]; then
  echo "$MANIFEST_FILE has no branches listed - nothing to do."
  exit 0
fi

# Always start from a clean copy of main - this is what keeps test ephemeral
# and makes "remove a branch from the manifest" trivial.
git checkout -B "$TEST_BRANCH" "origin/$BASE_BRANCH"

MERGED=()
: > "$SKIPPED_FILE"

while IFS= read -r branch; do
  branch="$(echo "$branch" | xargs)"  # trim whitespace
  [ -z "$branch" ] && continue

  if ! git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
    echo "$branch: branch not found on remote, skipping" | tee -a "$SKIPPED_FILE"
    continue
  fi

  echo "Merging $branch..."
  if git merge --no-ff --no-edit "origin/$branch" -m "Merge $branch into $TEST_BRANCH"; then
    MERGED+=("$branch")
    echo "  clean merge"
    continue
  fi

  # Merge failed. rerere may already have staged a resolution (autoUpdate).
  # If unmerged paths remain, there was no usable cached resolution.
  if git diff --name-only --diff-filter=U | grep -q .; then
    echo "  unresolved conflict, no rerere cache for this hunk"
    echo "$branch: conflicts with prior branch(es) in the stack, no cached resolution" >> "$SKIPPED_FILE"
    git merge --abort
  else
    git add -A
    git commit --no-edit
    MERGED+=("$branch (auto-resolved via rerere)")
    echo "  resolved automatically via rerere"
  fi
done < /tmp/manifest.txt

{
  echo "# Test Branch Status"
  echo "_Last rebuilt: $(date -u +'%Y-%m-%d %H:%M UTC')_"
  echo
  echo "## Merged (${#MERGED[@]})"
  if [ "${#MERGED[@]}" -eq 0 ]; then echo "_none_"; else
    for m in "${MERGED[@]}"; do echo "- $m"; done
  fi
  echo
  if [ -s "$SKIPPED_FILE" ]; then
    echo "## Skipped - needs attention"
    while IFS= read -r line; do echo "- $line"; done < "$SKIPPED_FILE"
  else
    echo "## Skipped"
    echo "_none_"
  fi
} > TEST_STATUS.md

git add TEST_STATUS.md
git commit --amend --no-edit

git push origin "$TEST_BRANCH" --force

if [ -s "$SKIPPED_FILE" ]; then
  echo "::warning::Some branches were skipped due to conflicts - see TEST_STATUS.md"
fi

exit 0  # best-effort: a skip never fails the job