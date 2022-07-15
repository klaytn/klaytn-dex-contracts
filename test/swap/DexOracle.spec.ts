import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { mineBlock, encodePrice } from '../shared/utilities';
import { pairFixture } from '../shared/fixtures';

const token0Amount = ethers.utils.parseEther('5');
const token1Amount = ethers.utils.parseEther('10');

describe('DexOracleTest', () => {
  let wallet: SignerWithAddress;
  let token0: Contract;
  let token1: Contract;
  let pair: Contract;
  let oracle: Contract;

  async function addLiquidity() {
    await token0.transfer(pair.address, token0Amount);
    await token1.transfer(pair.address, token1Amount);
    await pair.mint(wallet.address);
  }

  beforeEach(async () => {
    [wallet] = await ethers.getSigners();
    const fixture = await pairFixture(wallet);

    token0 = fixture.token0;
    token1 = fixture.token1;
    pair = fixture.pair;
    await addLiquidity();
    const oracleFactory = await ethers.getContractFactory('OracleTest');
    oracle = await oracleFactory.deploy(fixture.factory.address, token0.address, token1.address);
  });

  it('update', async () => {
    const blockTimestamp = (await pair.getReserves())[2];
    await mineBlock(blockTimestamp + 60 * 60 * 23);
    await expect(oracle.update()).to.be.reverted;
    await mineBlock(blockTimestamp + 60 * 60 * 24);
    await oracle.update();

    const expectedPrice = encodePrice(token0Amount, token1Amount);

    expect(await oracle.price0Average()).to.eq(expectedPrice[0]);
    expect(await oracle.price1Average()).to.eq(expectedPrice[1]);

    expect(await oracle.consult(token0.address, token0Amount)).to.eq(token1Amount);
    expect(await oracle.consult(token1.address, token1Amount)).to.eq(token0Amount);
  });
});
