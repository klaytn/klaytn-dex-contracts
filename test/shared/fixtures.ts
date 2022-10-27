import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FactoryFixture, PairFixture, RouterFixture } from './interfaces';

export async function factoryFixture(deployer: SignerWithAddress): Promise<FactoryFixture> {
  const Factory = await ethers.getContractFactory('DexFactory');
  const factory = await Factory.deploy(await deployer.getAddress());
  return { factory };
}

export async function pairFixture(
  deployer: SignerWithAddress,
): Promise<PairFixture> {
  const { factory } = await factoryFixture(deployer);
  const tokenFactory = await ethers.getContractFactory('KIP7Mock');
  const tokenA = await tokenFactory.deploy(ethers.utils.parseEther('10000'));
  const tokenB = await tokenFactory.deploy(ethers.utils.parseEther('10000'));
  await factory.createPair(tokenA.address, tokenB.address); // overrides
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
  const pair = await ethers.getContractAt('DexPair', pairAddress);

  const token0Address = (await pair.token0());
  const token0 = tokenA.address === token0Address ? tokenA : tokenB;
  const token1 = tokenA.address === token0Address ? tokenB : tokenA;

  return {
    factory, token0, token1, pair,
  };
}

export async function routerFixture(deployer: SignerWithAddress): Promise<RouterFixture> {
  // deploy tokens
  const tokenFactory = await ethers.getContractFactory('KIP7Mock');
  const WKLAY9Factory = await ethers.getContractFactory('WKLAY');
  const tokenA = await tokenFactory.deploy(ethers.utils.parseEther('10000'));
  const tokenB = await tokenFactory.deploy(ethers.utils.parseEther('10000'));
  const WKLAY = await WKLAY9Factory.deploy();
  const WKLAYPartner = await tokenFactory.deploy(ethers.utils.parseEther('10000'));

  // deploy factory
  const { factory } = await factoryFixture(deployer);

  // deploy router
  const routerFactory = await ethers.getContractFactory('DexRouter');
  const router = await routerFactory.deploy(factory.address, WKLAY.address);

  // initialize pair
  await factory.createPair(tokenA.address, tokenB.address);
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
  const pair = await ethers.getContractAt('DexPair', pairAddress);

  const token0Address = await pair.token0();
  const token0 = tokenA.address === token0Address ? tokenA : tokenB;
  const token1 = tokenA.address === token0Address ? tokenB : tokenA;

  await factory.createPair(WKLAY.address, WKLAYPartner.address);
  const WKLAYPairAddress = await factory.getPair(WKLAY.address, WKLAYPartner.address);
  const WKLAYPair = await ethers.getContractAt('DexPair', WKLAYPairAddress);

  return {
    token0,
    token1,
    WKLAY,
    WKLAYPartner,
    factory,
    router,
    pair,
    WKLAYPair,
  };
}
