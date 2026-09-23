FROM node:24 AS base-deps

WORKDIR /opt/app

COPY package*.json .
RUN npm clean-install

FROM base-deps AS deps

WORKDIR /opt/app

COPY . .

FROM deps AS test

WORKDIR /opt/app

CMD ["npm", "run", "test"]

# Branches off base-deps (before the full source COPY below) so this layer's cache key only
# depends on package*.json - an unrelated source change elsewhere in the repo won't bust it and
# force Chromium to reinstall on every push, only an actual @playwright/test version bump will.
FROM base-deps AS test-e2e

WORKDIR /opt/app

RUN npx playwright install --with-deps chromium

COPY . .

CMD ["npm", "run", "test:e2e"]

FROM deps AS build

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

ARG VITE_INSTANCE_ID=WAHealthSummary
ENV VITE_INSTANCE_ID=$VITE_INSTANCE_ID

RUN npm run build

FROM node:24-slim AS prod

WORKDIR /opt/app

COPY --from=build /opt/app/node_modules ./node_modules
COPY --from=build /opt/app/build ./build

COPY ./entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "build"]

FROM deps AS dev

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:24-slim AS prod-dynamic

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

ARG VITE_INSTANCE_ID=WAHealthSummary
ENV VITE_INSTANCE_ID=$VITE_INSTANCE_ID

ENV NODE_ENV=production

COPY --from=deps /opt/app/node_modules ./node_modules
COPY --from=deps /opt/app/src ./src
COPY --from=deps /opt/app/static ./static
COPY --from=deps /opt/app/package.json ./package.json
COPY --from=deps /opt/app/package-lock.json ./package-lock.json
COPY --from=deps /opt/app/svelte.config.js ./svelte.config.js
COPY --from=deps /opt/app/tsconfig.json ./tsconfig.json
COPY --from=deps /opt/app/vite.config.ts ./vite.config.ts

EXPOSE 3000

SHELL ["/bin/sh", "-c"]
CMD npm run build && npm run start
