#!/bin/bash

if [ "$#" -ne 0 ]; then
        exec "$@"
fi

if [ ! -f "/app/.env" ] ; then
        echo ".env is not found. Please mount .env. file to /app/.env. following to the example"
        cat /app/.env.example

        exit 1
fi

if [ -z $DEX_NETWORK_NAME ] ; then
        echo "Please set DEX_NETWORK_NAME; baobab, cypress"
        
        exit 1
fi

npx hardhat compile

npx hardhat run ./scripts/deployDEX.ts --network $DEX_NETWORK_NAME
