FROM node:18 as build-deps

EXPOSE 3000

# ENV DIRPATH /opt/app
ENV REACT_APP_REAL_SERVER_BASE=https://smart-health-links-server.cirg.washington.edu/api
ENV NODE_ENV production

WORKDIR /opt/app

COPY package*.json ./
RUN npm clean-install

COPY ./fix-popper.sh ./
RUN ./fix-popper.sh

COPY . .
RUN npm run build

RUN cp build/404.html build/index.html


CMD ["npm", "start"]