# My Health Summary

Public client component for the My Health Summary/WA Health Summary architecture.

## Developing

Install dependencies with `npm install` (or `pnpm install` or `yarn`)
Start the development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Docker

Copy the default env file:

```bash
cp default.env .env
```

Modify the `.env` file as necessary. Lines that are not commented-out are required, commented lines are optional.

Starting the docker container

```bash
docker-compose build && docker-compose up --detach
```

## Develop

Some configuration can be overridden by copying the development environment file:

```bash
cp default.env.development .env.development
```

### Testing

To run unit and component tests via vitest, run

```bash
npm run test
```

To run e2e tests via playwright, run

```bash
npm run test:e2e
```

# Test Branch Rebuild Workflow

Keeps a `test` branch continuously up to date with the current sprint's
feature branches, without manual merging and without permanently entangling
branch histories.

## How it works, in short

Every trigger, the workflow throws away the old `test` branch and rebuilds
it from scratch: `main` + every branch listed in `test-branch.manifest`,
merged in order. Because it always starts clean, `test` is disposable —
removing a branch from the sprint is a one-line edit, not a manual
un-merge.

Conflicts between two feature branches are resolved once, by hand, on the
`test` branch itself (never on the feature branches). `git rerere` caches
that resolution and reapplies it automatically on every future rebuild, for
as long as the conflicting code doesn't change again. If a conflict has no
cached resolution yet, that branch is skipped for this run (not fatal) and
flagged for follow-up.

## Setup (one time)

1. **Protect the `test` branch** against direct pushes. The workflow is the
   only thing that should ever write to it (it force-pushes on every run).
2. **Create `test-branch.manifest`** at the repo root, one feature branch
   per line. Blank lines and lines starting with `#` are ignored.
3. **Add the workflow file** at
   `.github/workflows/rebuild-test-branch.yml` and the script at
   `scripts/rebuild-test-branch.sh` (`chmod +x` it, or let the workflow do
   that for you — it already does).
4. **Confirm permissions**: the workflow needs `contents: write` (to push
   `test`) and `pull-requests: write` (to comment on skipped branches'
   PRs). Both are set in the provided YAML.
5. Point your test environment's deploy at the `test` branch, same as
   today.

## Day-to-day usage

**Adding a feature to the sprint's test build:**
Open a normal PR adding one line to `test-branch.manifest`. Once merged
into `main`, the next rebuild picks it up.

**Removing a feature (descoped, on hold, etc.):**
Same thing in reverse — delete its line via PR. On the next rebuild it
simply won't be there; nothing to unwind on the feature branch itself.

**Checking what's currently on test:**
Look at `TEST_STATUS.md` on the `test` branch. It's regenerated every run
and lists what merged cleanly, what merged via a rerere-cached resolution,
and what got skipped and why.

**When your branch gets skipped:**
You'll get a PR comment naming the conflicting branch(es). Pull `test` (or
the specific branch it's flagged against) locally, resolve the conflict
there once by hand, and push. The workflow re-triggers automatically, and
from then on rerere will reapply that same resolution on its own — you
shouldn't need to redo it unless one of the two branches touches that code
again.

## When rerere keeps failing on the same pair of branches

An occasional skip is normal — two branches happened to touch nearby code.
If the *same pair* keeps getting skipped across multiple rebuilds, that's
a signal the two features aren't actually independent; they're evolving
the same logic in parallel, and a merge conflict is just where that keeps
surfacing.

At that point, stop trying to resolve it as a conflict and instead make
the dependency explicit: pick whichever branch is conceptually "upstream,"
and retarget the other branch's PR onto it (using GitHub's stacked PR
support) instead of onto `main`. That turns a recurring merge fight into
an ordinary sequential review.

## Trigger schedule

- Push to any `feature/**` branch → rebuild.
- Push to `main` → rebuild (covers manifest edits).
- Every 15 minutes → safety-net rebuild in case a push-triggered run was
  missed or superseded.
- Manual `workflow_dispatch` → rebuild on demand from the Actions tab.

Concurrent triggers are collapsed: a newer push cancels an in-flight
rebuild rather than queuing behind it, since only the latest state
matters.

## Known limitations / things to harden later

- The rerere cache is stored via `actions/cache`, which is best-effort and
  can be evicted by GitHub. If you need it to never be lost, replace that
  step with committing `.git/rr-cache` to a dedicated orphan branch (e.g.
  `refs/heads/rerere-cache`) instead.
- Best-effort skipping means `test` can be incomplete relative to the full
  manifest at any given moment — check `TEST_STATUS.md` if you need to
  confirm a specific feature is actually present before testing against it.
- The PR-comment step assumes one open PR per branch head; if a branch has
  no open PR, the comment step silently does nothing for it (check
  `TEST_STATUS.md` instead).