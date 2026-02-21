FROM node:24 AS deps

WORKDIR /opt/app

COPY package*.json .
RUN npm clean-install

FROM node:24 AS builder

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

COPY --from=deps /opt/app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:24-slim AS runner

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

ENV NODE_ENV=production

COPY --from=builder /opt/app/.svelte-kit ./.svelte-kit
COPY --from=builder /opt/app/node_modules ./node_modules
COPY --from=builder /opt/app/src ./src
COPY --from=builder /opt/app/static ./static
COPY --from=builder /opt/app/package.json ./package.json
COPY --from=builder /opt/app/package-lock.json ./package-lock.json
COPY --from=builder /opt/app/svelte.config.js ./svelte.config.js
COPY --from=builder /opt/app/tsconfig.json ./tsconfig.json
COPY --from=builder /opt/app/vite.config.ts ./vite.config.ts

EXPOSE 3000

CMD npm run build && npm run start
