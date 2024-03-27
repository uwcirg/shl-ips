FROM node:18 as build-deps

EXPOSE 3000

# ENV DIRPATH /opt/app
ENV NODE_ENV production

WORKDIR /opt/app

COPY . .
RUN npm clean-install --include=dev

COPY ./fix-popper.sh .
RUN sed -i '/2\.11\.6/a \ \ "type": "module",' node_modules/@popperjs/core/package.json

RUN npm run build

RUN cp -r build/ips/assets build/assets

RUN cp build/404.html build/index.html

RUN chmod +x /opt/app/docker-entrypoint.sh

ENTRYPOINT ["/opt/app/docker-entrypoint.sh", "./docker-entrypoint.sh"]

CMD ["npm", "run", "start"]