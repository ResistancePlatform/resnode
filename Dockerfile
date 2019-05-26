FROM node:8.16.0-alpine
RUN apk update && apk upgrade && \
	apk add --no-cache bash git openssh

RUN addgroup -S resuser && adduser -S resuser -G resuser
ARG RES_HOME=/home/resuser

USER resuser
COPY . $RES_HOME/resnode
WORKDIR $RES_HOME/resnode
# DEBUGGING
RUN git status
# DEBUGGING
RUN npm install
RUN node setup.js
CMD node app.js

