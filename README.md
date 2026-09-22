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
