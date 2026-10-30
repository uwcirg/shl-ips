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

Keeps a `test/auto` branch up to date with a chosen set of feature branches,
without manual merging and without permanently entangling branch histories.

Files involved:

- `test-branch.manifest`: the list of branches to include.
- `rebuild-test-branch.sh`: the script that does the rebuild.
- `.github/workflows/rebuilt-test-branch.yaml`: runs the script in CI.

## How it works

Each run throws away the old `test/auto` and rebuilds it from scratch:

1. Reads `test-branch.manifest` **from `origin/main`**, not from the branch
   that triggered the run. A manifest edit only takes effect once it has
   been merged into `main`.
2. Resets `test/auto` to `origin/main`.
3. For each branch in the manifest, in order, runs
   `git merge --no-ff origin/<branch>`:
   - Clean merge: the branch is included.
   - Branch missing on the remote: skipped.
   - Merge conflict: the merge is aborted and the branch is **skipped**.
     Nothing is resolved for you (see "Conflicts" below).
4. Writes `TEST_STATUS.md` (merged and skipped branches) into the last
   commit and force-pushes `test/auto`.
5. Comments on the open PR of each skipped branch.

Because it always starts from `main`, `test/auto` is disposable. Removing a
branch from the sprint is a one-line manifest edit, with nothing to unwind
on the feature branch.

Order matters. Each branch is merged on top of the ones before it, so a
conflict is always reported against the later branch in the list. Put the
branch that is conceptually upstream earlier.

## Triggers

- Push to any `feature/**` branch.
- Push to `main` (covers manifest edits).
- Manual `workflow_dispatch` from the Actions tab.

There is no scheduled rebuild. Concurrent runs are collapsed: a newer push
cancels an in-flight rebuild.

## Setup (one time)

1. Protect `test/auto` against direct pushes. The workflow is the only
   thing that should write to it, and it force-pushes on every run.
2. Make sure the workflow has `contents: write` (to push the branch) and
   `pull-requests: write` (to comment on PRs). Both are set in the YAML.
3. Point any test environment deploys at `test/auto`.

## Day-to-day usage

**Adding a feature:** open a normal PR adding the feature branch to 
`test-branch.manifest`. Once it is merged into `main`, the next rebuild
picks it up.

**Removing a feature:** delete its branch from `test-branch.manifest`.

**Checking what's on the test branch:** read `TEST_STATUS.md` on `test/auto`.
It lists what merged and what was skipped. Check it before testing against
a specific feature, because `test/auto` can be missing branches at any
moment.

## Conflicts

A conflicting branch is skipped. `test/auto` is rebuilt from `main` and 
force-pushed on every run, so the conflict has to be fixed in the branches
themselves.
Pick one way to **Resolve within the branches:**
1. **Pre-merge**: Merge or rebase to resolve the conflict on the downstream branch.
   Retarget its PR onto the upstream branch.
2. **Post-merge**: Wait for the upstream branch to reach `main`, then resolve the
   conflict with main on the unmerged downstream branch.

## Known limitations

- `test/auto` is best-effort and can be incomplete relative to the
  manifest. A skip never fails the job (it only emits a warning).
- The PR comment step assumes one open PR per branch head. If a branch has
  no open PR, nothing is posted, so check `TEST_STATUS.md` instead.
- A branch that depends on a skipped branch may conflict and be skipped as
  well.
