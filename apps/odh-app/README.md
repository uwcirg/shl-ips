# odh-app

A standalone page for recording health-related work information. The user describes their current and past jobs in their own words. Each one is matched to standard occupation and industry codes by the NIOSH autocoder, and the user reviews the codes before saving. The result can be downloaded as a FHIR R4 Bundle of [Occupational Data for Health](http://hl7.org/fhir/us/odh/) Observations.

The form and the autocoder endpoint come from [`odh-autocoder`](../../packages/odh-autocoder). This app only adds the page, its own secrets, and an access check. It has no accounts, storage or other features of the main app.

## Setup

```bash
cp .env.example .env   # then set AUTOCODER_API_KEY
```

| Variable | |
|---|---|
| `AUTOCODER_API_KEY` | Required. NIOSH autocoder subscription key. Read on the server at runtime and never sent to the browser. |
| `AUTOCODER_API_URL` | Optional. Autocoder endpoint; defaults to the staging instance. |
| `ORIGIN` | Production behind a proxy: the app's public URL, for example `https://odh.example.org` |

Never commit `.env`.

## Running

From the repository root (this also builds the package):

```bash
npm install
npm run dev:odh      # http://localhost:5190
npm run build:odh    # production build in apps/odh-app/build
npm run test:odh
```

Or in this directory, once the package is built: `npm run dev`, `npm run build`, `npm test`, `npm run check`.

Running the production build:

```bash
node --env-file=.env build    # or set the variables in the environment; PORT defaults to 3000
```

## Access control

`/api/nio-autocoder` only answers requests that come from this app's own pages. It checks the browser's `Sec-Fetch-Site` header, falling back to `Origin` or `Referer` (see `src/lib/server/sameOrigin.ts`). Other websites can't use your API key quota through it. This isn't authentication, though: a script that sends those headers itself gets through. If the app is public and the quota matters, add rate limiting or real auth in `authorize`.

## Moving to its own repository

The app depends on `odh-autocoder` by version (`^0.1.0`), not by path. Once the package is published somewhere the new repository can install from, split this directory out:

```bash
git subtree split --prefix=apps/odh-app -b odh-app
```

Then add a registry config (`.npmrc`) if needed.
