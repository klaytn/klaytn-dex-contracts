# Klaytn-DEX Project

Open-source DEX for Klaytn. This repository is for smart-contracts part of DEX.

## Deploy
Before deployment, please, set up required parameters in your .env file described in .env.example.
To deploy all DEX Smart Contracts, please run 
```bash 
npx hardhat run scripts/deployDEX.ts --network `network`
```
command with the specified `network` argument. In case you want to deploy DEX Smart Contracts on a forked network, please uncomment the hardhat network in `networks` in hardhat.config.ts file and set url you want to fork from.
## Tests
Before testing, please, provide your MNEMONIC in .env file.
- Unit test\n
To run unit test, please run 
```bash 
npx hardhat test
```
