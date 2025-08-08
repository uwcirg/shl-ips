FROM node:24 AS build-deps

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING
ENV NODE_ENV=production

WORKDIR /opt/app

COPY package*.json .
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD npm run build-runtime && npm run start
