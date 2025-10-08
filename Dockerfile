FROM node:24 AS build-deps

ARG VITE_APP_VERSION_STRING
ENV VITE_APP_VERSION_STRING=$VITE_APP_VERSION_STRING

EXPOSE 3000

# ENV DIRPATH /opt/app
ENV NODE_ENV=production

WORKDIR /opt/app

COPY . .
RUN npm install --include=dev

RUN sed -i '/2\.11\.6/a \ \ "type": "module",' node_modules/@popperjs/core/package.json

RUN npm run build

CMD npm run build && npm run start
