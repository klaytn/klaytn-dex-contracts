# Klaytn-DEX Project

Open-source DEX for Klaytn. This repository is for smart-contracts part of DEX.

## Deploy
Before deployment, please, set up all required parameters in your .env file described in the .env.example.

### Using command line
To deploy all DEX Smart Contracts, please run 
```bash 
npx hardhat run scripts/deployDEX.ts --network `network`
```
command with the specified `network` argument. In case of hardhat network deployment, there is no need to provide any additional parameters. 
The `network` should be configured in your hardhat.config.ts file in HardhatUserConfig.networks section. Please, refer to the [Hardhat Networks Configuration](`https://hardhat.org/hardhat-runner/docs/config#networks-configuration`) guide for more information. Currently, the following networks are already configured:
- hardhat (default)
- baobab (Klaytn Baobab Testnet)

Example:
```bash 
npx hardhat run scripts/deployDEX.ts --network baobab
```
Example (default hardhat network):
```bash 
npx hardhat run scripts/deployDEX.ts
```

### Using Docker
Docker and docker-compose are required for this step.

You can see the following in `docker-compose.yaml`. Please update `DEX_NETWORK_NAME` you want to deploy.
```yaml
version: "3.7"

services:
  app:
    build: .
    volumes:
      - ./.env:/app/.env
      - ./deployments:/app/deployments
    environment:
      DEX_NETWORK_NAME: baobab
```

```bash
docker-compose up --build
```

## Tests
Before running tests, please, provide the following parameters in a .env file: `MNEMONIC`, `FORKING`(true/false) and `FORKING_URL` (in case of `FORKING` is true).
To run all unit tests, please run 
```bash 
npx hardhat test
```

## Forking
You can start an instance of Hardhat Network that forks the specified network via its Archive Node RPC endpoint. It will simulate having the same state as the network, but it will work as a local development network. Please, refer to the [Hardhat Forking](`https://hardhat.org/hardhat-network/docs/guides/forking-other-networks`) guide for more information. 
To use this feature you need to set up `FORKING` parameter as `true` and provide `FORKING_URL` in your .env file.
After setting up forking parameters you can run all the tests on the forked network
```bash 
npx hardhat test
```
or launch the deployment script
```bash 
npx hardhat run scripts/deployDEX.ts
```
to simulate the deployment process to the forked network.

## Documentation

The repository contains Klaytn-DEX specification and audit reports ([learn more](./docs/README.md)).

## Want to Contribute to Klaytn DEX Contracts? <a id="want-to-contribute"></a>

In line with our commitment to decentralization, all Klaytn codebase and its documentations are completely open source. Klaytn always welcomes your contribution. Anyone can view, edit, fix its contents and make suggestions. You can either create a pull request on GitHub or create a enhancement request. Make sure to check our [Contributor License Agreement (CLA)](https://gist.github.com/e78f99e1c527225637e269cff1bc7e49) first and there are also a few guidelines our contributors would check out before contributing:

- [Contribution Guide](./CONTRIBUTING.md)
- [License](./LICENSE)
- [Code of Conducts](./code-of-conduct.md)