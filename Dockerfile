FROM node:8-alpine

WORKDIR /code/

EXPOSE 3000

COPY . .

RUN npm install

ENTRYPOINT node server.js
