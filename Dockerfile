FROM node:18 as build-deps

EXPOSE 3000

# ENV DIRPATH /opt/app
ENV NODE_ENV production

WORKDIR /opt/app

COPY . .
RUN npm clean-install --include=dev

RUN sed -i '/2\.11\.6/a \ \ "type": "module",' node_modules/@popperjs/core/package.json

CMD npm run build && npm run start
