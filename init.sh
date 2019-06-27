#!/bin/bash
set -eo pipefail

export RES_HOME=/home/resuser
export RES_BIN=/home/resuser/resistance

# Init steps when running as root
if [ "$(id -u)" = "0" ]; then
    mkdir -p ${RES_HOME}/resnode
    cp -ru /resnode/* /home/resuser/resnode
    chown resuser:resuser -R $RES_HOME/resnode
    exec gosu resuser "$BASH_SOURCE" "$@"
fi

tail -f /dev/null
