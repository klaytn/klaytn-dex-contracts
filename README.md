# Klaytn-DEX Project

Open-source DEX for Klaytn. This repository is for smart-contracts part of DEX.

## Deploy
Before deployment, please, set up required parameters in your .env file described in the .env.example.
To deploy all DEX Smart Contracts, please run 
```bash 
npx hardhat run scripts/deployDEX.ts --network `network`
```
command with the specified `network` argument. In case you want to deploy DEX Smart Contracts on a forked network, please uncomment the hardhat network in `networks` in the hardhat.config.ts file and set an archive node's url you want to fork from. Default (commented out) is Klaytn Mainnet public archive node.
## Tests
Before running tests, please, provide your MNEMONIC in a .env file.
To run all unit tests, please run 
```bash 
npx hardhat test
```