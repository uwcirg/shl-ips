# odh-autocoder

A Svelte form for collecting someone's work history as Occupational Data for Health (ODH). Free-text job and industry descriptions are coded with the [NIOSH Industry and Occupation Computerized Coding System](https://csams.cdc.gov/nioccs/) (the "autocoder"). The user reviews the suggested codes, and saving produces [ODH IG](http://hl7.org/fhir/us/odh/) FHIR R4 Observations.

The package contains:

- **Components**: the form and its inputs (Svelte 4, Bootstrap via sveltestrap)
- **Server handler**: a SvelteKit request handler that calls the autocoder with your API key, so the key stays on the server
- **FHIR builders**: pure functions between form values and ODH resources

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

```svelte
<script lang="ts">
  import { OdhForm } from 'odh-autocoder';
  import type { Observation } from 'fhir/r4';

  let resources: Observation[] | undefined; // existing ODH resources to edit, if any

  function onsave(saved: Observation[]) {
    // store, bundle, download...
  }
</script>

<OdhForm {resources} {onsave} />
```

| Prop | Default | |
|---|---|---|
| `resources` | `undefined` | Existing ODH Observations to edit. `undefined` gives a new, empty form. |
| `onsave` | none | Called with the built resources when the user clicks **Save work info** |
| `processing` | `false` | Shows the save button as busy |
| `endpoint` | `/api/nio-autocoder` | Where the inputs send autocoder requests (the route from step 2) |
| `getAccessToken` | none | `() => Promise<string \| undefined>`. If set, autocoder requests carry `Authorization: Bearer <token>`. |

Also exported: `AutocoderInput` (one coded field: `mode="Occupation" | "Industry"`, `bind:value`, `id`, `endpoint`, `getAccessToken`) and `MonthInput` (`bind:value` as `YYYY-MM`).

#### Page requirements

- **Client-only:** render the components with `export const ssr = false` (for example in `+layout.ts`). `MonthInput` checks browser support while it's being created.
- **Styles:** load Bootstrap 5 CSS (for example `import 'bootstrap/dist/css/bootstrap.min.css'`) and the [Bootstrap Icons](https://icons.getbootstrap.com/) stylesheet. The form adds a few `:global` layout rules for its own `.inline-form-group` and `.odh-section` classes.
- **Vite:** in dev, add `optimizeDeps: { include: ['@sveltestrap/sveltestrap'] }`. Otherwise Vite discovers sveltestrap on the first page load and reloads partway through rendering.

### FHIR builders

These are pure and deterministic: no I/O, no clock, and ids come from each entry's position.

```ts
import { buildOdhResources, applyOdhResources, defaultOdhFormValues } from 'odh-autocoder';

const values = applyOdhResources(defaultOdhFormValues(), existingObservations);
const observations = buildOdhResources(values);
// employment status, current jobs, past jobs, retirement dates, combat zone periods
```

`buildOdhResources` also has one builder per resource kind (`buildCurrentJobResources`, ...). Types: `OdhFormValues`, `CurrentJobValues`, `PastJobValues`, `IOResponse`, `AutocoderResponse`, `CodingMode`. Constants: `EMPLOYMENT_STATUSES`, `NOT_CODED`.

## Developing

From the repository root:

```bash
npm run dev:pkg     # rebuild dist/ on change (svelte-package --watch)
npm run dev         # in another terminal: the main app, using the rebuilt package
npm run dev:lite    # or the lite app
```

Apps use the built `dist/`. Root `dev`, `build`, `test` and `check` build the package first.

In this directory:

| Command | |
|---|---|
| `npm run dev` | Playground at http://localhost:5180: the form, wired to the real handler and a local mock autocoder. Put `AUTOCODER_API_KEY` in `packages/odh-autocoder/.env` to use the real API. `src/routes` isn't published. |
| `npm run package` | Build `dist/` and check the package's exports with publint |
| `npm test` | Vitest: builders against fixtures, handler, components |
| `npm run check` | svelte-check |
| `npm run lint` | Package boundary rule (below) |

### Fixtures

`src/test/fixtures/odh/*.json` hold the resources the main app's form produced before the extraction. The builder and component tests must reproduce them exactly. If you change the output on purpose, update the fixtures in the same commit (`npx vitest run -u`) and review the diff.

### Package boundary

`eslint.config.js` fails `npm run lint` when package code imports:

- anything outside this directory
- an app's aliases or package name (`$config`, `$theme`, `shlips`, `odh-lite`)
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

- If the coding service fails, an industry entered manually is stored with the occupation "not coded" code `00-0000`.
- Industry codings use the system `http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH`, while occupation codings use `http://hl7.org/fhir/us/odh/CodeSystem/PHOccupationalDataForHealthODH`.
- Every resource's `subject` is a fixed placeholder, `Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299`.
- Year-only dates on existing resources (such as `2009`) are dropped when edited, because the month inputs hold `YYYY-MM`.
- Occupation text is sent in the query string, so it can show up in proxy access logs.
