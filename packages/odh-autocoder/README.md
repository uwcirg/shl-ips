# odh-autocoder

A Svelte form for collecting someone's work history as Occupational Data for Health (ODH). Free-text job and industry descriptions are coded with the [NIOSH Industry and Occupation Computerized Coding System](https://csams.cdc.gov/nioccs/) (the "autocoder"). The user reviews the suggested codes, and saving produces [ODH IG](http://hl7.org/fhir/us/odh/) FHIR R4 Observations.

The package contains:

- **Components**: the form and its inputs (Svelte 4, Bootstrap via sveltestrap)
- **Server handler**: a SvelteKit request handler that calls the autocoder with your API key, so the key stays on the server
- **FHIR builders**: pure functions between form entries and ODH resources

It doesn't do auth, persistence, routing or app config. The app that uses it passes those in.

Used by the main app at the repository root and by [`apps/odh-app`](../../apps/odh-app).

## Using it in an app

### 1. Install

Inside this monorepo, add `"odh-autocoder": "^0.1.0"` to the app's `dependencies`. npm links the workspace copy. The package is private and not published yet, so outside the monorepo you'd install it from wherever it ends up being published.

Peer dependencies the app provides: `svelte@^4`, `@sveltejs/kit@^1`, `@sveltestrap/sveltestrap@^6`.

### 2. Mount the autocoder endpoint

```ts
// src/routes/api/nio-autocoder/+server.ts
import { env } from '$env/dynamic/private';
import { createAutocoderHandler } from 'odh-autocoder/server';

export const GET = createAutocoderHandler({
  apiKey: () => env.AUTOCODER_API_KEY,
  authorize: (event) => /* your access check */ true
});
```

| Option | Default | |
|---|---|---|
| `apiKey` | (required) | Autocoder subscription key, sent as `Ocp-Apim-Subscription-Key`. A string, or a function to read it per request. |
| `apiUrl` | `https://apistg.cdc.gov/nioautocoder/1.1.0/code` | Autocoder endpoint (the staging instance) |
| `maxResults` | `6` | Suggestions to request (`n`) |
| `authorize` | none | `(event) => boolean \| Promise<boolean>`. A false result rejects the request with 403. Leave it unset if a hook already protects the route. |

The handler accepts `GET ?o=<occupation text>` and/or `?i=<industry text>`, and responds with:

- **200** and `{ Industry?, Occupation?, Scheme? }`, where each suggestion is `{ Code, Title, Score }`
- **400** when the request has no `o` and no `i`
- **403** when `authorize` rejects the request
- **503** when no key is configured
- **502** with a generic message when the autocoder fails

It never logs request or response contents (occupation text can be sensitive), and never exposes upstream error details.

`odh-autocoder/server` throws if it ends up in a browser bundle. Import it only from server files.

### 3. Render the form

The quickest way is the ready-made `OdhForm`: every section in an accordion, with **Save work info** and **Clear changes** buttons.

```svelte
<script lang="ts">
  import { OdhForm } from 'odh-autocoder';
  import type { Observation } from 'fhir/r4';

  let resources: Observation[] | undefined; // existing ODH resources to edit, if any

  function onsave(saved: Observation[]) {
    // store, bundle, download...
  }
</script>

<OdhForm {resources} {onsave} createId={() => crypto.randomUUID()} />
```

| Prop | Default | |
|---|---|---|
| `resources` | `undefined` | Existing ODH Observations to edit. `undefined` gives a new, empty form. |
| `onsave` | none | Called with the built resources when the user clicks **Save work info** |
| `processing` | `false` | Shows the save button as busy |
| `endpoint` | `/api/nio-autocoder` | Where coders send autocoder requests (the route from step 2) |
| `getAccessToken` | none | `() => Promise<string \| undefined>`. If set, autocoder requests carry `Authorization: Bearer <token>`. |
| `subject` | none | A FHIR `Reference` (for example `{ reference: 'Patient/123' }`) set as every saved resource's `subject`. Without it, resources have no subject. |
| `createId` | none | Makes ids for new entries. See [Resource ids](#resource-ids). |
| `getId` | `resource.id` | The id for an entry read from a resource. See [Resource ids](#resource-ids). |
| `sections` | all five | Which sections to show, and save, in order: `employmentStatus`, `currentWork`, `pastWork`, `retirementDates`, `combatPeriods` |
| `jobCoder` | `JobFieldsCoder` | Codes each job's occupation and industry. See [Coders](#coders). |
| `fieldCoder` | `AutocoderSearchInput` | The field coder `JobFieldsCoder` uses for each field |
| `entryForms` | defaults | Replaces a section's per-entry form, e.g. `{ pastWork: MyPastJobForm }` |

#### Your own layout

`OdhForm` is a layout over pieces you can use directly:

```
OdhFormProvider          state, ids, submit/reset; renders no markup of its own
└─ PastWorkSection       the list: one entry form per entry, Add and Delete
   └─ PastJobForm        one job: a job coder + start and end dates      (entryForm prop)
      └─ JobFieldsCoder  occupation + industry                           (jobCoder prop)
         └─ AutocoderSearchInput ×2   one field each                     (fieldCoder prop)
```

`OdhFormProvider` takes the same data props as `OdhForm` (`resources`, `onsave`, `subject`, `createId`, `getId`, `endpoint`, `getAccessToken`, `processing`). Its slot gets `submit`, `reset`, `values`, `isWorking` and `processing`, and you write the markup:

```svelte
<OdhFormProvider {resources} {onsave} {createId} let:submit let:reset let:isWorking>
  <h2>Your job</h2>
  <EmploymentStatusSection />
  {#if isWorking}
    <CurrentWorkSection jobCoder={JobDescriptionCoder} />
  {/if}
  <button on:click={submit}>Save</button>
  <button on:click={reset}>Start over</button>
</OdhFormProvider>
```

- **Only the sections in the layout are saved.** A section registers with the provider when it first appears, and stays registered if an `{#if}` hides it later. Pass `sections` to the provider to choose them yourself instead.
- **Each section can appear once per form.** Showing one twice logs an error.
- **Cross-section rules** live in the builder, not the layout. Current jobs are saved only while the status is Employed, and they date the employment status.
- **Sections**: `EmploymentStatusSection` (exactly one status, no Add or Delete), `CurrentWorkSection`, `PastWorkSection`, `RetirementDateSection`, `CombatPeriodSection`. They have no headings or accordion. Label text can be changed with `labels`.
- **Entry forms**: `CurrentJobForm`, `PastJobForm`, `RetirementDateForm`, `CombatPeriodForm`. Props: `bind:entry`, `idPrefix`, `labels`, plus `jobCoder` and `fieldCoder` for jobs. An `actions` slot at the end of the last row holds the section's Delete button.
- **Without a provider**, a section edits what you bind: `<PastWorkSection bind:entries {createId} />`, `<EmploymentStatusSection bind:entry />`.
- **No components at all**: `createOdhFormState()` is the same state as a Svelte store. Its actions are `add`, `remove`, `setStatus`, `load`, `reset` and `toResources`.

#### Coders

There are two levels, and each can be swapped with a prop:

- A **job coder** codes a job's occupation and industry. Props: `bind:occupation`, `bind:industry` (`IOResponse | undefined`), `idPrefix`, `tense` (`'current' | 'past'`), `labels`. It also gets `fieldCoder` when the app sets one.
  - `JobFieldsCoder` (the default): a labeled field coder for each field.
  - `JobDescriptionCoder` (experimental): one free-text description, coded as both occupation and industry in one request. The user then picks from each list of suggestions.
- A **field coder** codes one field. Props: `mode` (`'Occupation' | 'Industry'`), `bind:value`, `id`.
  - `AutocoderSearchInput` (the default): searches as the user types, and they pick a suggestion. Also exported under its old name, `AutocoderInput`.

Leave a value `undefined` when nothing has been picked; the builders save it as not coded (`00-0000` or `000000`). To call the autocoder, a coder uses `getAutocoderClient()`. The provider sets it up from `endpoint` and `getAccessToken`. `client.code({ occupation?, industry? })` codes one or both fields in one request. `withoutNotCoded`, `notCoded` and `isNotCoded` help with the suggestion lists.

`MonthInput` is also exported (`bind:value` as `YYYY-MM`, or `YYYY` for a year-only date).

#### Page requirements

- **Client-only:** render the components with `export const ssr = false` (for example in `+layout.ts`). `MonthInput` checks browser support while it's being created.
- **Styles:** load Bootstrap 5 CSS (for example `import 'bootstrap/dist/css/bootstrap.min.css'`) and the [Bootstrap Icons](https://icons.getbootstrap.com/) stylesheet. The entry forms import `odh-layout.css`, which styles the `.odh-*` classes they use. `OdhForm` adds a `:global` rule for its `.odh-section` accordion items.
- **Vite:** in dev, add `optimizeDeps: { include: ['@sveltestrap/sveltestrap'] }`. Otherwise Vite discovers sveltestrap on the first page load and reloads partway through rendering.

### Resource ids

Each form entry (one job, one date, the status) becomes one resource, and an entry's `id` becomes its resource's `id`. Ids are optional and come from the app:

- `createId()` makes the id for each entry the user adds, and for a new form's defaults. Without it, those resources have no `id`.
- `getId(resource)` gives the id for an entry read from an existing resource. It defaults to `resource.id`.

An entry keeps its id while it's edited, and deleting one entry doesn't change the others. So an app can match each saved resource to the one it came from. The main app saves new entries under random UUIDs, and reads back the source identifier it recorded for each resource when it was first saved.

### FHIR builders

Pure functions between entries and resources: no I/O and no clock.

```ts
import { readOdhValues, buildOdhResources } from 'odh-autocoder';

const values = readOdhValues(existingObservations, { getId, createId });
const observations = buildOdhResources(values, { subject: { reference: 'Patient/123' } });
// employment status, current jobs, past jobs, retirement dates, combat zone periods

buildOdhResources(values, { sections: ['pastWork'] }); // only some sections
```

- **One entry**: `buildEmploymentStatus`, `buildCurrentJob`, `buildPastJob`, `buildRetirementDate`, `buildCombatPeriod`.
- **One section**: `buildCurrentJobs`, `buildPastJobs`, `buildRetirementDates`, `buildCombatPeriods`. They leave out duplicates (keeping the first entry's id), and empty dates and periods.
- **Reading**: `readOdhValues`, or per section `readEmploymentStatus`, `readCurrentJobs`, `readPastJobs`, `readRetirementDates`, `readCombatPeriods`.
- **Types**: `OdhFormValues`, `EmploymentStatusEntry`, `CurrentJobEntry`, `PastJobEntry`, `RetirementDateEntry`, `CombatPeriodEntry`, `OdhSectionKey`, `OdhBuildOptions`, `OdhReadOptions`, `IOResponse`, `AutocoderResponse`, `CodingMode`.
- **Constants**: `EMPLOYMENT_STATUSES`, `NOT_CODED`, `ODH_SECTIONS`.

## Developing

From the repository root:

```bash
npm run dev:pkg     # rebuild dist/ on change (svelte-package --watch)
npm run dev         # in another terminal: the main app, using the rebuilt package
npm run dev:odh    # or the ODH app
```

Apps use the built `dist/`. Root `dev`, `build`, `test` and `check` build the package first.

In this directory:

| Command | |
|---|---|
| `npm run dev` | Playground at http://localhost:5180: the form, wired to the real handler and a local mock autocoder, and at `/custom` a custom layout, the description coder and a standalone section. Put `AUTOCODER_API_KEY` in `packages/odh-autocoder/.env` to use the real API. `src/routes` isn't published. |
| `npm run package` | Build `dist/` and check the package's exports with publint |
| `npm test` | Vitest: builders against fixtures, handler, components |
| `npm run check` | svelte-check |
| `npm run lint` | Package boundary rule (below) |

### Fixtures

`src/test/fixtures/odh/*.json` hold the resources the main app's form produced before the extraction. The only difference is the ids: tests use a counting `createId` (`id-1`, `id-2`, ...), and keep the ids of the resources they read in. The builder and `OdhForm` tests must reproduce them exactly. If you change the output on purpose, update the fixtures in the same commit (`npx vitest run -u`) and review the diff.

On Windows, run the tests from PowerShell or cmd. Under Git Bash, vitest loads twice through differently-cased drive paths, and every test file fails in `setup.ts` with "Cannot read properties of undefined (reading 'on')".

### Package boundary

`eslint.config.js` fails `npm run lint` when package code imports:

- anything outside this directory
- an app's aliases or package name (`$config`, `$theme`, `shlips`, `odh-app`)
- `$env/*` or `$app/*` from `src/lib` (the playground in `src/routes` may use them)

Apps pass in what the package needs through props and handler options.

### Moving to its own repository

The package only imports from its own directory and its declared dependencies, and its scripts don't refer to the monorepo. To split it out with history:

```bash
git subtree split --prefix=packages/odh-autocoder -b odh-autocoder
```

Then publish it (for example to GitHub Packages, with a scope added to the name) and point apps at that version.

## Known issues

These behaviors were kept as they were in the original code:

- Occupation text is sent in the query string, so it can show up in proxy access logs.
