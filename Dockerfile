FROM node:8.16.0-alpine as builder
run apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python && \
  npm install --quiet node-gyp -g &&\
  npm install --quiet && \
  apk del native-deps

RUN apk update && apk upgrade && \
	apk add --no-cache bash git openssh-client

RUN addgroup -S resuser && adduser -S resuser -G resuser
ARG RES_HOME=/home/resuser
COPY . $RES_HOME/resnode
RUN chown resuser:resuser $RES_HOME $RES_HOME/*
USER resuser
WORKDIR $RES_HOME/resnode
# Warning!!!
# Copy our private key into the image to be able to npm install
# from our private repos
ARG SSH_PRIVATE_KEY
RUN mkdir $RES_HOME/.ssh/
RUN echo "${SSH_PRIVATE_KEY}" > $RES_HOME/.ssh/id_rsa
RUN chmod 0400 $RES_HOME/.ssh/id_rsa
# make sure your domain is accepted
RUN touch $RES_HOME/.ssh/known_hosts
RUN ssh-keyscan github.com >> $RES_HOME/.ssh/known_hosts

# DEBUGGING
RUN ls -alht
RUN whoami

RUN npm install

#RUN node setup.js
#CMD node app.js

