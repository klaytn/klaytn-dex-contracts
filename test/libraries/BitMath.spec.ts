import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { BitMathTest } from '../../typechain/mocks/BitMathTest';

describe('BitMath', () => {
  let bitMath: BitMathTest;
  before('deploy BitMathTest', async () => {
    const bitMathFactoty = await ethers.getContractFactory('BitMathTest');
    bitMath = await bitMathFactoty.deploy();
  });

  describe('#mostSignificantBit', () => {
    it('0', async () => {
      await expect(bitMath.mostSignificantBit(0)).to.be.revertedWith('BitMath::mostSignificantBit: zero');
    });
    it('1', async () => {
      expect(await bitMath.mostSignificantBit(BigNumber.from(1))).to.eq(0);
    });
    it('2', async () => {
      expect(await bitMath.mostSignificantBit(BigNumber.from(2))).to.eq(1);
    });
    it('all powers of 2', async () => {
      const results = await Promise.all(
        [...Array(255)].map((_, i) => bitMath.mostSignificantBit(BigNumber.from(2).pow(i))),
      );
      expect(results).to.deep.eq([...Array(255)].map((_, i) => i));
    });
    it('uint256(-1)', async () => {
      expect(await bitMath.mostSignificantBit(BigNumber.from(2).pow(256).sub(1))).to.eq(255);
    });
    it('gas cost of smaller number [ @skip-on-coverage ]', async () => {
      expect(await bitMath.getGasCostOfMostSignificantBit(BigNumber.from(3568))).to.eq(595);
    });
    it('gas cost of max uint128 [ @skip-on-coverage ]', async () => {
      expect(await bitMath.getGasCostOfMostSignificantBit(
        BigNumber.from(2).pow(128).sub(1),
      )).to.eq(1067);
    });
    it('gas cost of max uint256 [ @skip-on-coverage ]', async () => {
      expect(await bitMath.getGasCostOfMostSignificantBit(
        BigNumber.from(2).pow(256).sub(1),
      )).to.eq(1185);
    });
  });

  describe('#leastSignificantBit', () => {
    it('0', async () => {
      await expect(bitMath.leastSignificantBit(0)).to.be.revertedWith('BitMath::leastSignificantBit: zero');
    });
    it('1', async () => {
      expect(await bitMath.leastSignificantBit(BigNumber.from(1))).to.eq(0);
    });
    it('2', async () => {
      expect(await bitMath.leastSignificantBit(BigNumber.from(2))).to.eq(1);
    });
    it('all powers of 2', async () => {
      const results = await Promise.all(
        [...Array(255)].map((_, i) => bitMath.leastSignificantBit(BigNumber.from(2).pow(i))),
      );
      expect(results).to.deep.eq([...Array(255)].map((_, i) => i));
    });
    it('uint256(-1)', async () => {
      expect(await bitMath.leastSignificantBit(BigNumber.from(2).pow(256).sub(1))).to.eq(0);
    });
    it('gas cost of smaller number [ @skip-on-coverage ]', async () => {
      expect(await bitMath.getGasCostOfLeastSignificantBit(BigNumber.from(3568))).to.eq(1063);
    });
    it('gas cost of max uint128 [ @skip-on-coverage ]', async () => {
      expect(await bitMath.getGasCostOfLeastSignificantBit(
        BigNumber.from(2).pow(128).sub(1),
      )).to.eq(1156);
    });
    it('gas cost of max uint256 [ @skip-on-coverage ]', async () => {
      expect(await bitMath.getGasCostOfLeastSignificantBit(
        BigNumber.from(2).pow(256).sub(1),
      )).to.eq(1156);
    });
  });
});
