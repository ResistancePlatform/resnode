#!/bin/bash
set -eo pipefail

export RES_HOME=/home/resuser
export RES_BIN=/home/resuser/resistance
export CONFIG_JSON=./config/config.json

# Init steps when running as root
if [ "$(id -u)" = "0" ]; then
    mkdir -p ${RES_HOME}/resnode
    rsync -r --links --delete /resnode/ /home/resuser/resnode
    chown resuser:resuser -R $RES_HOME/resnode
    exec gosu resuser "$BASH_SOURCE" "$@"
fi

if [[ ! -f ${CONFIG_JSON} ]]; then
    echo "The ${CONFIG_JSON} file is missing!"
    exit
fi

email=$(cat ${CONFIG_JSON} | jq .super.email)
stakeaddr=$(cat ${CONFIG_JSON} | jq .super.stakeaddr)
fqdn=$(cat ${CONFIG_JSON} | jq .super.fqdn)

while [ "$email" = null ] || [ "$stakeaddr" = null ] || [ "$fqdn" = null ]; do
    echo You must be sure to set your email, stake address and node fdqn in ${CONFIG_JSON}
    sleep 1
done

#for f in addr email fqdn;do
#    v=$(cat config.json | jq .super.$f)
#    if [[ ${v} = null ]]; then
#	echo The super.$f is unset!
#    fi
#done

npm start
