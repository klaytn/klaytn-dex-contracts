// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre, { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import fs from 'fs';

const network = hre.network.name;
dotenv.config();

const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
Object.keys(envConfig).forEach((key) => {
  process.env[key] = envConfig[key];
});

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;
  console.log('Sender address: ', deployer);
  // Deploy Staking Factory
  const stakingFactory = await ethers.getContractFactory('StakingFactory');
  const factoryInstance = await stakingFactory.deploy(process.env.MULTISIG as string);
  await factoryInstance.deployed();

  console.log(`Staking Factory deployed to : ${factoryInstance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
