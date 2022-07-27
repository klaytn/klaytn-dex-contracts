import * as dotenv from 'dotenv';
import '@nomiclabs/hardhat-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomicfoundation/hardhat-chai-matchers';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenv.config();

let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error('Please set your MNEMONIC in a .env file');
} else {
  mnemonic = process.env.MNEMONIC;
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      'contracts/tokens/WKLAY.sol': {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      'contracts/utils/SafeMath.sol': {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    // hardhat: {
    //   forking: {
    //     url: 'https://cypress.fandom.finance/archive',
    //   },
    // },
    baobab: {
      url: 'https://api.baobab.klaytn.net:8651/',
      accounts: { mnemonic, initialIndex: 0 },
      chainId: 1001,
      gas: 8500000,
      gasPrice: 250000000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== 'false',
    currency: 'USD',
    gasPrice: 250,
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5',
    dontOverrideCompile: false,
  },
};

export default config;
