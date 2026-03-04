FROM node:24 AS deps

WORKDIR /opt/app

COPY package*.json .
RUN npm clean-install

FROM node:24-slim AS prod

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

ENV NODE_ENV=production

COPY --from=deps /opt/app/node_modules ./node_modules

COPY . .

RUN npm run build

EXPOSE 3000

SHELL ["/bin/sh", "-c"]
CMD npm run build && npm run start

FROM node:24 AS dev

WORKDIR /opt/app

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

ENV NODE_ENV=development

COPY --from=deps /opt/app/node_modules ./node_modules
COPY --from=deps package*.json ./

EXPOSE 3000

CMD ["npm", "run", "dev"]