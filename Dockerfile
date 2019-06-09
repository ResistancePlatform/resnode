FROM node:8.16.0-alpine as builder
RUN apk --no-cache add --virtual native-deps \
	g++ make python
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
RUN touch $RES_HOME/.ssh/known_hosts
RUN ssh-keyscan github.com >> $RES_HOME/.ssh/known_hosts
RUN npm install
# The first stage's image will not include any of this but
# just to err on the side of caution, delete the private key
RUN rm $RES_HOME/.ssh/id_rsa

# The second stage will not contain any of the history from the builder image
# i.e. the private ssh key
FROM node:8.16.0-alpine
ARG RES_HOME=/home/resuser
USER resuser
COPY --from=builder $RES_HOME/resnode .
CMD node setup.js && node app.js

