#!/bin/bash
set -eo pipefail

export RES_HOME=/home/resuser
export RES_BIN=/home/resuser/resistance

# Init steps when running as root
if [ "$(id -u)" = "0" ]; then
    mkdir -p ${RES_HOME}/resnode
    rsync -r --links --delete /resnode/ /home/resuser/resnode
    chown resuser:resuser -R $RES_HOME/resnode
    exec gosu resuser "$BASH_SOURCE" "$@"
fi

if [[ -d ./config ]]; then
    # We need to initialize resnode
    echo You must initialize resnode before continuing see the README
    sleep 10m
fi
npm start
