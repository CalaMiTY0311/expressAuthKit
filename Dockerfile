FROM node:20.10.0

# Set the working directory
WORKDIR /main
RUN mkdir -p /main/db
RUN mkdir -p /main/redisData

COPY ./server/app.js /main/authserver/app.js
COPY ./server/apis /main/authserver/apis
COPY ./server/src /main/authserver/src
COPY ./server/.env /main/authserver/.env
COPY ./server/package.json /main/authserver/package.json

# Set working directory to the authserver
WORKDIR /main/authserver
RUN npm install

RUN apt-get update && \
    apt-get install -y --no-install-recommends default-jre default-jdk
