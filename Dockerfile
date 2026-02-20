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

COPY --from=builder /opt/app/package*.json ./
COPY --from=builder /opt/app/node_modules ./node_modules
COPY --from=builder /opt/app/build ./build
COPY --from=builder /opt/app/static ./static

EXPOSE 3000

CMD npm run build-runtime && npm run start
