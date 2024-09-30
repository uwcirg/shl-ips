FROM node:18 as build-deps

EXPOSE 3000

# ENV DIRPATH /opt/app
ENV NODE_ENV production

WORKDIR /opt/app

COPY package*.json ./

COPY . .

# RUN npm install openai

RUN sed -i '/2\.11\.6/a \ \ "type": "module",' node_modules/@popperjs/core/package.json

RUN npm clean-install --include=dev

#RUN npm install openai

#RUN sed -i '/2\.11\.6/a \ \ "type": "module",' node_modules/@popperjs/core/package.json

#RUN npm run build
RUN npm run build --loglevel verbose

RUN cp build/404.html build/index.html

CMD ["sh", "-c", "npm run build && cp build/404.html build/index.html && npm run start"]
