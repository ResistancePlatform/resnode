#!/bin/bash
set -eo pipefail

export RES_HOME=/home/resuser
export RES_BIN=/home/resuser/resistance
export CONFIG_JSON=./config/config.json

# Init steps when running as root
if [ "$(id -u)" = "0" ]; then
    mkdir -p ${RES_HOME}/resnode
    rsync --update -r --links --delete /resnode/ ${RES_HOME}/resnode
    chown resuser:resuser -R $RES_HOME/resnode
    exec gosu resuser "$BASH_SOURCE" "$@"
fi

# Actual run commands as resuser
cd ${RES_HOME}/resnode
if [[ ! -f ${CONFIG_JSON} ]]; then
    echo "The ${CONFIG_JSON} file is missing!"
    exit
fi

email=$(cat ${CONFIG_JSON} | jq .super.email)
stakeaddr=$(cat ${CONFIG_JSON} | jq .super.stakeaddr)
fqdn=$(cat ${CONFIG_JSON} | jq .super.fqdn)

# This will sit in a loop until we've restarted the container and these values have all been set
while [ "$email" = null ] || [ "$stakeaddr" = null ] || [ "$fqdn" = null ]; do
    echo You must be sure to set your email, stake address and node fdqn in ${CONFIG_JSON}
    sleep 1
done

node ./app.js
