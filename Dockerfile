FROM node:8.16.0-stretch as builder
RUN apt-get install g++ make python -y
RUN apt-get update && apt-get upgrade -y && \
	apt-get install bash git openssh-client -y

RUN groupadd -g 1001 resuser && useradd -r -u 1001 -g resuser resuser
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
USER root
RUN rm $RES_HOME/.ssh/id_rsa

# The second stage will not contain any of the history from the builder image
# i.e. the private ssh key
FROM node:8.16.0-stretch

ARG GOSU_VERSION=1.11
ARG GOSU_PATH=/usr/local/bin/gosu 
RUN dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')" \
	&& wget -O $GOSU_PATH "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch" \
	&& chmod +x $GOSU_PATH \
	&& gosu nobody true
ARG GOSU_SHA="0b843df6d86e270c5b0f5cbd3c326a04e18f4b7f9b8457fa497b0454c4b138d7  /usr/local/bin/gosu"
RUN echo "$GOSU_SHA"
RUN echo "$(sha256sum $GOSU_PATH)"
RUN [ "$(sha256sum $GOSU_PATH)" = "${GOSU_SHA}" ] || exit 1
RUN apt-get update -y && apt-get install rsync -y

RUN groupadd -g 1001 resuser && useradd -r -u 1001 -g resuser resuser
ARG RES_HOME=/home/resuser
COPY --from=builder $RES_HOME/resnode /resnode
RUN chown -R resuser:resuser /resnode

# This script runs as root to copy files into place (the mounted volume will ignore
# the node app files otherwise) then execs as resuser to finish the resnode setup steps
RUN chmod +x /resnode/init.sh

# TODO implement the run script
WORKDIR /resnode
ENTRYPOINT /resnode/init.sh
