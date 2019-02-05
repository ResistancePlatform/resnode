# WORKING_DIR=`basename $PWD` && docker run -ti --rm -v "$HOME":"$HOME" -v "$PWD":"/$WORKING_DIR" -v /etc/group:/etc/group:ro -v /etc/passwd:/etc/passwd:ro -w "/$WORKING_DIR" -u $( id -u $USER ):$( id -g $USER ) rescorebuilder:latest /bin/bash

# This is a multistage build, see https://docs.docker.com/develop/develop-images/multistage-build/
# Build rescore
FROM ubuntu:16.04 as resistance-core
RUN apt-get update && apt-get install build-essential automake libtool pkg-config libcurl4-openssl-dev curl bsdmainutils apt-utils git pwgen -y

# For now, until the repos are public, we need to mount our ~/.ssh directory into the container
# May need to swith over to resisttance-core-upgrade temporarily
RUN git clone git@github.com:ResistancePlatform/resistance-core.git
WORKDIR /resistance-core
CMD ./resutil/build.sh -j2 --skip-tests

# Node app
# Need to determine correct automation steps here. . .
# https://medium.com/@mccode/processes-in-containers-should-not-run-as-root-2feae3f0df3b
# https://medium.com/@mccode/understanding-how-uid-and-gid-work-in-docker-containers-c37a01d01cf

