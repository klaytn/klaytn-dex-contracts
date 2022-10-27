// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import * as dotenv from 'dotenv';
import { writeDeploymentForSubgraph } from './helpers';

let adminsList: string[];
let sigRequired: string;
let rewardPerBlock: BigNumber;
dotenv.config();

if (!process.env.ADMIN_LIST && !process.env.SIG_REQUIRED) {
  throw new Error('Please set your ADMIN_LIST and SIG_REQUIRED in the .env file');
} else {
  adminsList = JSON.parse(process.env.ADMIN_LIST as string);
  sigRequired = JSON.parse(process.env.SIG_REQUIRED as string);
}

if (!process.env.REWARD_PER_BLOCK) {
  throw new Error('Please set your rewardPerBlock param (in wei) for farming contract in the .env file');
} else {
  rewardPerBlock = BigNumber.from(process.env.REWARD_PER_BLOCK as string);
}

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;
  console.log('Sender address: ', deployer);

  // Deploy WKLAY
  const wklay = await ethers.getContractFactory('WKLAY');
  const wklayInstance = await wklay.deploy();
  await wklayInstance.deployed();
  console.log(`WKLAY deployed to: ${wklayInstance.address}`);

  // Deploy Dex Factory
  const factory = await ethers.getContractFactory('DexFactory');
  const factoryInstance = await factory.deploy(deployer);
  await factoryInstance.deployed();
  console.log(`Dex Factory deployed to: ${factoryInstance.address}`);
  await writeDeploymentForSubgraph('DexFactory', factoryInstance);

  // Deploy Dex Router passing Factory Address and WKLAY Address
  const router = await ethers.getContractFactory('DexRouter');
  const routerInstance = await router.deploy(
    factoryInstance.address,
    wklayInstance.address,
  );
  await routerInstance.deployed();
  console.log(`Dex Router deployed to:  ${routerInstance.address}`);

  // Deploy Multisig passing adminsList addresses and sigRequired params from .env file
  const multisig = await ethers.getContractFactory('MultiSigWallet');
  const multisigInstance = await multisig.deploy(adminsList, sigRequired);
  await multisigInstance.deployed();
  console.log(`Multisig deployed to: ${multisigInstance.address}`);

  // Deploy Multicall
  const multicall = await ethers.getContractFactory('Multicall');
  const multicallInstance = await multicall.deploy();
  await multicallInstance.deployed();
  console.log(`MultiCall deployed to: ${multicallInstance.address}`);

  // Deploy Dex Token
  const dexToken = await ethers.getContractFactory('PlatformToken');
  const dexTokenInstance = await dexToken.deploy('Klaytn DEX', 'KDEX', multisigInstance.address);
  await dexTokenInstance.deployed();
  console.log(`Dex Token deployed to: ${dexTokenInstance.address}`);

  // Deploy Farming
  const farming = await ethers.getContractFactory('Farming');
  const currentBlock = await ethers.provider.getBlockNumber();
  const farmingInstance = await farming.deploy(
    dexTokenInstance.address,
    rewardPerBlock,
    currentBlock + 1,
    multisigInstance.address,
  );
  await farmingInstance.deployed();
  console.log(`Farming deployed to: ${farmingInstance.address}`);
  await writeDeploymentForSubgraph('Farming', farmingInstance);

  // Deploy Staking Factory passing multisig contract's address as a parameter
  const stakingFactory = await ethers.getContractFactory('StakingFactory');
  const stakingFactoryInstance = await stakingFactory.deploy(multisigInstance.address);
  await stakingFactoryInstance.deployed();
  console.log(`Staking Factory deployed to: ${stakingFactoryInstance.address}`);
  await writeDeploymentForSubgraph('StakingFactory', stakingFactoryInstance);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
