// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;
  console.log('Sender address: ', deployer);

  // Deploy WETH
  const weth = await ethers.getContractFactory('WETH9');
  const wethInstance = await weth.deploy();
  await wethInstance.deployed();

  console.log(`WETH deployed to : ${wethInstance.address}`);

  // Deploy Factory
  const factory = await ethers.getContractFactory('DexFactory');
  const factoryInstance = await factory.deploy(deployer);
  await factoryInstance.deployed();

  console.log(`Factory deployed to : ${factoryInstance.address}`);

  // Deploy Router passing Factory Address and WETH Address
  const router = await ethers.getContractFactory('DexRouter');
  const routerInstance = await router.deploy(
    factoryInstance.address,
    wethInstance.address,
  );
  await routerInstance.deployed();

  console.log(`Router deployed to :  ${routerInstance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
