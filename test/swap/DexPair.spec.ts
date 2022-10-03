import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { encodePrice, mineBlock } from '../shared/utilities';
import { pairFixture } from '../shared/fixtures';

const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3);

describe('DexPair', () => {
  let wallet: SignerWithAddress;
  let other: SignerWithAddress;

  let factory: Contract;
  let token0: Contract;
  let token1: Contract;
  let pair: Contract;
  beforeEach(async () => {
    [wallet, other] = await ethers.getSigners();
    const fixture = await pairFixture(wallet);
    factory = fixture.factory;
    token0 = fixture.token0;
    token1 = fixture.token1;
    pair = fixture.pair;
  });

  it('mint', async () => {
    const token0Amount = ethers.utils.parseEther('1');
    const token1Amount = ethers.utils.parseEther('4');
    await token0.transfer(pair.address, token0Amount);
    await token1.transfer(pair.address, token1Amount);

    const expectedLiquidity = ethers.utils.parseEther('2');
    await expect(pair.mint(wallet.address))
      .to.emit(pair, 'Transfer')
      .withArgs(constants.AddressZero, constants.AddressZero, MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Transfer')
      .withArgs(constants.AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount, token1Amount)
      .to.emit(pair, 'Mint')
      .withArgs(wallet.address, token0Amount, token1Amount);

    expect(await pair.totalSupply()).to.eq(expectedLiquidity);
    expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY));
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount);
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount);
    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount);
    expect(reserves[1]).to.eq(token1Amount);
  });

  async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
    await token0.transfer(pair.address, token0Amount);
    await token1.transfer(pair.address, token1Amount);
    await pair.mint(wallet.address);
  }
  const swapTestCases: any[][] = [
    [1, 5, 10, '1662497915624478906'],
    [1, 10, 5, '453305446940074565'],

    [2, 5, 10, '2851015155847869602'],
    [2, 10, 5, '831248957812239453'],

    [1, 10, 10, '906610893880149131'],
    [1, 100, 100, '987158034397061298'],
    [1, 1000, 1000, '996006981039903216'],
  ].map((a) => a.map((n) => (typeof n === 'string' ? BigNumber.from(n) : ethers.utils.parseEther(`${n}`))));
  swapTestCases.forEach((swapTestCase, i) => {
    it(`getInputPrice:${i}`, async () => {
      const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCase;
      await addLiquidity(token0Amount, token1Amount);
      await token0.transfer(pair.address, swapAmount);
      await expect(pair.swap(0, expectedOutputAmount.add(1), wallet.address, '0x')).to.be.revertedWithCustomError(
        pair,
        'InsufficientAmount',
      )
        .withArgs('DEX: K');
      await pair.swap(0, expectedOutputAmount, wallet.address, '0x');
    });
  });

  const optimisticTestCases: any[][] = [
    [0.997, 5, 10, 1], // given amountIn, amountOut = floor(amountIn * .997)
    [0.997, 10, 5, 1],
    [0.997, 5, 5, 1],
    [1, 5, 5, '1003009027081243732'], // given amountOut, amountIn = ceiling(amountOut / .997)
  ].map((a) => a.map((n) => (typeof n === 'string' ? n : ethers.utils.parseEther(`${n}`))));
  optimisticTestCases.forEach((optimisticTestCase, i) => {
    it(`optimistic:${i}`, async () => {
      const [outputAmount, token0Amount, token1Amount, inputAmount] = optimisticTestCase;
      await addLiquidity(token0Amount, token1Amount);
      await token0.transfer(pair.address, inputAmount);
      await expect(pair.swap(outputAmount.add(1), 0, wallet.address, '0x')).to.be.revertedWithCustomError(
        pair,
        'InsufficientAmount',
      )
        .withArgs('DEX: K');
      await pair.swap(outputAmount, 0, wallet.address, '0x');
    });
  });

  it('swap:token0', async () => {
    const token0Amount = ethers.utils.parseEther('5');
    const token1Amount = ethers.utils.parseEther('10');
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('1662497915624478906');
    await token0.transfer(pair.address, swapAmount);
    await expect(pair.swap(0, expectedOutputAmount, wallet.address, '0x'))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address);

    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount.add(swapAmount));
    expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount));
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(swapAmount));
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount));
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address))
      .to.eq(totalSupplyToken0.sub(token0Amount).sub(swapAmount));
    expect(await token1.balanceOf(wallet.address))
      .to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount));
  });

  it('swap:token1', async () => {
    const token0Amount = ethers.utils.parseEther('5');
    const token1Amount = ethers.utils.parseEther('10');
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('453305446940074565');
    await token1.transfer(pair.address, swapAmount);
    await expect(pair.swap(expectedOutputAmount, 0, wallet.address, '0x'))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(swapAmount))
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, 0, swapAmount, expectedOutputAmount, 0, wallet.address);

    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount));
    expect(reserves[1]).to.eq(token1Amount.add(swapAmount));
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount));
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(swapAmount));
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address))
      .to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount));
    expect(await token1.balanceOf(wallet.address))
      .to.eq(totalSupplyToken1.sub(token1Amount).sub(swapAmount));
  });

  it('swap:gas [ @skip-on-coverage ]', async () => {
    const token0Amount = ethers.utils.parseEther('5');
    const token1Amount = ethers.utils.parseEther('10');
    await addLiquidity(token0Amount, token1Amount);

    // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
    await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1);
    await pair.sync();

    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('453305446940074565');
    await token1.transfer(pair.address, swapAmount);
    await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1);
    const tx = await pair.swap(expectedOutputAmount, 0, wallet.address, '0x');
    const receipt = await tx.wait();
    expect(receipt.gasUsed).to.eq(74056);
  });

  it('burn', async () => {
    const token0Amount = ethers.utils.parseEther('3');
    const token1Amount = ethers.utils.parseEther('3');
    await addLiquidity(token0Amount, token1Amount);

    const expectedLiquidity = ethers.utils.parseEther('3');
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY));
    await expect(pair.burn(wallet.address))
      .to.emit(pair, 'Transfer')
      .withArgs(pair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, '2999999999999999000')
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, '2999999999999999000')
      .to.emit(pair, 'Sync')
      .withArgs(1000, 1000)
      .to.emit(pair, 'Burn')
      .withArgs(wallet.address, '2999999999999999000', '2999999999999999000', wallet.address);

    expect(await pair.balanceOf(wallet.address)).to.eq(0);
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
    expect(await token0.balanceOf(pair.address)).to.eq(1000);
    expect(await token1.balanceOf(pair.address)).to.eq(1000);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(1000));
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(1000));
  });

  it('price{0,1}CumulativeLast', async () => {
    const token0Amount = ethers.utils.parseEther('3');
    const token1Amount = ethers.utils.parseEther('3');
    await addLiquidity(token0Amount, token1Amount);

    const blockTimestamp = (await pair.getReserves())[2];
    await mineBlock(blockTimestamp + 1);
    await pair.sync();

    const initialPrice = encodePrice(token0Amount, token1Amount);
    expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0]
      .mul((await pair.getReserves())[2] - blockTimestamp));
    expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1]
      .mul((await pair.getReserves())[2] - blockTimestamp));
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 2);

    const swapAmount = ethers.utils.parseEther('3');
    await token0.transfer(pair.address, swapAmount);
    await mineBlock(blockTimestamp + 10);
    // swap to a new price eagerly instead of syncing
    await pair.swap(0, ethers.utils.parseEther('1'), wallet.address, '0x'); // make the price nice

    expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0]
      .mul((await pair.getReserves())[2] - blockTimestamp));
    expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1]
      .mul((await pair.getReserves())[2] - blockTimestamp));
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 11);

    await mineBlock(blockTimestamp + 20);
    await pair.sync();

    const newPrice = encodePrice(ethers.utils.parseEther('6'), ethers.utils.parseEther('2'));
    expect(await pair.price0CumulativeLast())
      .to.eq(initialPrice[0].mul(11)
        .add(newPrice[0].mul(10)));
    expect(await pair.price1CumulativeLast())
      .to.eq(initialPrice[1].mul(11)
        .add(newPrice[1]
          .mul(10)));
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 21);
  });

  it('feeTo:off', async () => {
    const token0Amount = ethers.utils.parseEther('1000');
    const token1Amount = ethers.utils.parseEther('1000');
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('996006981039903216');
    await token1.transfer(pair.address, swapAmount);
    await pair.swap(expectedOutputAmount, 0, wallet.address, '0x');

    const expectedLiquidity = ethers.utils.parseEther('1000');
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY));
    await pair.burn(wallet.address);
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
  });

  it('feeTo:on', async () => {
    await factory.setFeeTo(other.address);

    const token0Amount = ethers.utils.parseEther('1000');
    const token1Amount = ethers.utils.parseEther('1000');
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('996006981039903216');
    await token1.transfer(pair.address, swapAmount);
    await pair.swap(expectedOutputAmount, 0, wallet.address, '0x');

    const expectedLiquidity = ethers.utils.parseEther('1000');
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY));
    await pair.burn(wallet.address);
    expect(await pair.totalSupply()).to.eq('249750499252388');
    expect(await pair.balanceOf(other.address)).to.eq('249750499251388');

    // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY
    // because the amounts only happen to be equal...
    // ...because the initial liquidity amounts were equal
    expect(await token0.balanceOf(pair.address)).to.eq('249501683698445');
    expect(await token1.balanceOf(pair.address)).to.eq('250000187313969');
  });

  it('skim', async () => {
    const token0Amount = ethers.utils.parseEther('5');
    const token1Amount = ethers.utils.parseEther('10');
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('1662497915624478906');
    await token0.transfer(pair.address, swapAmount);
    await pair.swap(0, expectedOutputAmount, wallet.address, '0x');
    const reserves = await pair.getReserves();
    await pair.skim(wallet.address);
    expect(reserves[0]).to.eq(token0Amount.add(swapAmount));
    expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount));
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(swapAmount));
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount));
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address))
      .to.eq(totalSupplyToken0.sub(token0Amount).sub(swapAmount));
    expect(await token1.balanceOf(wallet.address))
      .to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount));
  });

  it('swap fail', async () => {
    const token0Amount = ethers.utils.parseEther('1000');
    const token1Amount = ethers.utils.parseEther('1000');
    await addLiquidity(token0Amount, token1Amount);
    const expectedOutputAmount = BigNumber.from('1662497915624478906');
    await expect(pair.swap(0, expectedOutputAmount, token0.address, '0x'))
      .to.be.revertedWithCustomError(pair, 'InvalidAddressParameters')
      .withArgs('DEX: INVALID_TO');
    await expect(pair.swap(token0Amount.sub(100), token1Amount.sub(200), wallet.address, '0x'))
      .to.be.revertedWithCustomError(pair, 'InsufficientAmount')
      .withArgs('DEX: INSUFFICIENT_INPUT_AMOUNT');
    await expect(pair.swap(0, 0, wallet.address, '0x'))
      .to.be.revertedWithCustomError(pair, 'InsufficientAmount')
      .withArgs('DEX: INSUFFICIENT_OUTPUT_AMOUNT');
    await expect(pair.swap(ethers.utils.parseEther('2000'), 0, wallet.address, '0x'))
      .to.be.revertedWithCustomError(pair, 'InsufficientLiquidity')
      .withArgs('DEX: INSUFFICIENT_LIQUIDITY');
    await expect(pair.swap(0, expectedOutputAmount, wallet.address, '0xabcdef'))
      .to.be.rejectedWith('Transaction reverted: function call to a non-contract account');
    await expect(pair.swap(0, expectedOutputAmount, pair.address, '0xabcdef'))
      .to.be.rejectedWith("Transaction reverted: function selector was not recognized and there's no fallback function");
  });

  it('mint fail', async () => {
    const token0Amount = ethers.utils.parseEther('1000');
    const token1Amount = ethers.utils.parseEther('1000');
    await addLiquidity(token0Amount, token1Amount);
    await expect(pair.mint(wallet.address))
      .to.be.revertedWithCustomError(pair, 'InsufficientLiquidity')
      .withArgs('DEX: INSUFFICIENT_LIQUIDITY_MINTED');
  });

  it('burn fail', async () => {
    const token0Amount = ethers.utils.parseEther('1000');
    const token1Amount = ethers.utils.parseEther('1000');
    await addLiquidity(token0Amount, token1Amount);
    await expect(pair.burn(wallet.address))
      .to.be.revertedWithCustomError(pair, 'InsufficientLiquidity')
      .withArgs('DEX: INSUFFICIENT_LIQUIDITY_BURNED');
  });

  it('init fail', async () => {
    await expect(pair.initialize(token0.address, token1.address)).to.be.revertedWithCustomError(pair, 'Unauthorized');
  });
});
