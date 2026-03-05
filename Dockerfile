FROM node:24 AS deps

WORKDIR /opt/app

COPY package*.json .
RUN npm clean-install

COPY . .

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

COPY --from=build /opt/app/.svelte-kit ./.svelte-kit
COPY --from=build /opt/app/node_modules ./node_modules
COPY --from=build /opt/app/src ./src
COPY --from=build /opt/app/static ./static
COPY --from=build /opt/app/package.json ./package.json
COPY --from=build /opt/app/package-lock.json ./package-lock.json
COPY --from=build /opt/app/svelte.config.js ./svelte.config.js
COPY --from=build /opt/app/tsconfig.json ./tsconfig.json
COPY --from=build /opt/app/vite.config.ts ./vite.config.ts

EXPOSE 3000

SHELL ["/bin/sh", "-c"]
CMD npm run build && npm run start
