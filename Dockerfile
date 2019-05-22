# This Dockerfile packages the resistance-core build environment, allowing for easy generation of binaries
# for CI/CD and convenient local builds
# for example, run the following commands to build the image locally
# and exec into the container for a fully contained and instant build environment
# docker build . -f ./Dockerfile.build -t rescorebuilder:latest
# WORKING_DIR=`basename $PWD` && docker run -ti --rm -v "$HOME":"$HOME" -v "$PWD":"/$WORKING_DIR" -v /etc/group:/etc/group:ro -v /etc/passwd:/etc/passwd:ro -w "/$WORKING_DIR" -u $( id -u $USER ):$( id -g $USER ) rescorebuilder:latest /bin/bash
# then, from inside the container, run ./resutil/build.sh
FROM ubuntu:16.04

# Install dependencies
RUN apt-get update && apt-get install build-essential automake libtool pkg-config libcurl4-openssl-dev curl bsdmainutils apt-utils -y

