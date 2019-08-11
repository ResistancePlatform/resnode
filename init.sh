#!/bin/bash
echo "Enter your node's FQDN"
read fqdn

echo "Enter your nodes' stake address"
read stakeaddr

echo "Enter your email address"
read email

CONFIG_JSON=./config/config.json
sed -i "s/\"stakeaddr\".*/\"stakeaddr\": \"$stakeaddr\",/" $CONFIG_JSON
sed -i "s/\"email\".*/\"email\": \"$email\",/" $CONFIG_JSON
sed -i "s/\"fqdn\".*/\"fqdn\": \"$fqdn\",/" $CONFIG_JSON
