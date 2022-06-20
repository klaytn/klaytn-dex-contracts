// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

let adminsMock: string[];

if (!process.env.ADMIN_LIST) {
  throw new Error('Please set your MNEMONIC in a .env file');
} else {
  adminsMock = JSON.parse(process.env.ADMIN_LIST as string);
}

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;
  console.log('Sender address: ', deployer);

  // Deploy Multisig
  const multisig = await ethers.getContractFactory('MultiSigWallet');
  const multisigInstance = await multisig.deploy(adminsMock, 2);
  await multisigInstance.deployed();

  console.log(`Multisig deployed to : ${multisigInstance.address}`);

  // Deploy Dex Token
  const dexToken = await ethers.getContractFactory('PlatformToken');
  const dexTokenInstance = await dexToken.deploy('Klaytn DEX', 'KDEX', multisigInstance.address);
  await dexTokenInstance.deployed();

  console.log(`Token deployed to : ${dexTokenInstance.address}`);

  // Deploy Farming
  const farming = await ethers.getContractFactory('Farming');
  const rewardPerBlock = ethers.utils.parseEther('0.005');
  const currentBlock = await ethers.provider.getBlockNumber();
  const farmingInstance = await farming.deploy(
    dexTokenInstance.address,
    rewardPerBlock,
    currentBlock + 1,
    multisigInstance.address,
  );
  await farmingInstance.deployed();
  console.log(`Farming deployed to : ${farmingInstance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
