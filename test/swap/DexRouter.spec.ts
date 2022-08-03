import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { routerFixture } from '../shared/fixtures';
import { getPermitSignature, mineBlock } from '../shared/utilities';
import { DexFactory } from '../../typechain/swap/DexFactory';
import { DexPair } from '../../typechain/swap/DexPair';
import { KIP7Mock } from '../../typechain/mocks/KIP7TestMock.sol/KIP7Mock';
import { DexRouter } from '../../typechain/swap/DexRouter';

const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3);

describe('DexRouter', () => {
  let wallet: SignerWithAddress;
  let token0: KIP7Mock;
  let token1: KIP7Mock;
  let router: DexRouter;
  let factory: DexFactory;
  let pair: DexPair;
  let WKLAY: Contract;
  let WKLAYPair: DexPair;
  let WKLAYPartner: Contract;

  beforeEach(async () => {
    [wallet] = await ethers.getSigners();
    const fixture = await routerFixture(wallet);
    token0 = fixture.token0;
    token1 = fixture.token1;
    router = fixture.router;
    factory = fixture.factory;
    pair = fixture.pair;
    WKLAY = fixture.WKLAY;
    WKLAYPair = fixture.WKLAYPair;
    WKLAYPartner = fixture.WKLAYPartner;
  });

  afterEach(async () => {
    expect(await ethers.provider.getBalance(router.address)).to.eq(0);
  });

  async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
    await token0.transfer(pair.address, token0Amount);
    await token1.transfer(pair.address, token1Amount);
    await pair.mint(wallet.address);
  }

  it('quote', async () => {
    expect(await router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(200)))
      .to.eq(BigNumber.from(2));
    expect(await router.quote(BigNumber.from(2), BigNumber.from(200), BigNumber.from(100)))
      .to.eq(BigNumber.from(1));
    await expect(router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_AMOUNT',
      );
    await expect(router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_LIQUIDITY',
      );
    await expect(router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_LIQUIDITY',
      );
  });

  it('getAmountOut', async () => {
    expect(await router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(100)))
      .to.eq(BigNumber.from(1));
    await expect(router.getAmountOut(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_INPUT_AMOUNT',
      );
    await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(0), BigNumber.from(100)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_LIQUIDITY',
      );
    await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(0)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_LIQUIDITY',
      );
  });

  it('getAmountIn', async () => {
    expect(await router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(100)))
      .to.eq(BigNumber.from(2));
    await expect(router.getAmountIn(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_OUTPUT_AMOUNT',
      );
    await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(0), BigNumber.from(100)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_LIQUIDITY',
      );
    await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0)))
      .to.be.revertedWith(
        'DexLibrary: INSUFFICIENT_LIQUIDITY',
      );
  });

  it('getAmountsOut', async () => {
    await token0.approve(router.address, constants.MaxUint256);
    await token1.approve(router.address, constants.MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      ethers.utils.parseEther('10000'),
      ethers.utils.parseEther('10000'),
      0,
      0,
      wallet.address,
      constants.MaxUint256,
    );

    await expect(router.getAmountsOut(BigNumber.from(2), [token0.address])).to.be.revertedWith(
      'DexLibrary: INVALID_PATH',
    );
    const path = [token0.address, token1.address];
    expect(await router.getAmountsOut(BigNumber.from(2), path))
      .to.deep.eq([BigNumber.from(2), BigNumber.from(1)]);
  });

  it('getAmountsIn', async () => {
    await token0.approve(router.address, constants.MaxUint256);
    await token1.approve(router.address, constants.MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      constants.MaxUint256,
    );

    await expect(router.getAmountsIn(BigNumber.from(1), [token0.address])).to.be.revertedWith(
      'DexLibrary: INVALID_PATH',
    );
    const path = [token0.address, token1.address];
    expect(await router.getAmountsIn(BigNumber.from(1), path))
      .to.deep.eq([BigNumber.from(2), BigNumber.from(1)]);
  });

  it('factory, WKLAY', async () => {
    expect(await router.factory()).to.eq(factory.address);
    expect(await router.WKLAY()).to.eq(WKLAY.address);
  });

  it('addLiquidity', async () => {
    const token0Amount = ethers.utils.parseEther('1');
    const token1Amount = ethers.utils.parseEther('4');

    const expectedLiquidity = ethers.utils.parseEther('2');
    await token0.approve(router.address, constants.MaxUint256);
    await token1.approve(router.address, constants.MaxUint256);
    await expect(
      router.addLiquidity(
        token0.address,
        token1.address,
        token0Amount,
        token1Amount,
        0,
        0,
        wallet.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(token0, 'Transfer')
      .withArgs(wallet.address, pair.address, token0Amount)
      .to.emit(token1, 'Transfer')
      .withArgs(wallet.address, pair.address, token1Amount)
      .to.emit(pair, 'Transfer')
      .withArgs(constants.AddressZero, constants.AddressZero, MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Transfer')
      .withArgs(constants.AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount, token1Amount)
      .to.emit(pair, 'Mint')
      .withArgs(router.address, token0Amount, token1Amount);

    expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY));
  });

  it('addLiquidityNonExistedPool', async () => {
    const token2 = await (await ethers.getContractFactory('KIP7Mock')).deploy(ethers.utils.parseEther('400'));
    const token0Amount = ethers.utils.parseEther('1');
    const token2Amount = ethers.utils.parseEther('4');

    await token0.approve(router.address, constants.MaxUint256);
    await token2.approve(router.address, constants.MaxUint256);
    await expect(
      router.addLiquidity(
        token0.address,
        token2.address,
        token0Amount,
        token2Amount,
        0,
        0,
        wallet.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(token0, 'Transfer')
      .to.emit(token2, 'Transfer')
      .to.emit(factory, 'PairCreated');
  });

  it('addLiquidity:fail', async () => {
    const token0Amount = ethers.utils.parseEther('1');
    const token1Amount = ethers.utils.parseEther('4');

    await token0.approve(router.address, constants.MaxUint256);
    await token1.approve(router.address, constants.MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      token0Amount,
      token1Amount,
      0,
      0,
      wallet.address,
      constants.MaxUint256,
    );
    await expect(
      router.addLiquidity(
        token0.address,
        token1.address,
        10,
        10,
        token0Amount,
        token1Amount,
        wallet.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithCustomError(router, 'InsufficientAmount')
      .withArgs('DexRouter: INSUFFICIENT_A_AMOUNT');
    await expect(
      router.addLiquidity(
        token0.address,
        token1.address,
        10,
        token1Amount,
        token0Amount,
        token1Amount,
        wallet.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithCustomError(router, 'InsufficientAmount')
      .withArgs('DexRouter: INSUFFICIENT_B_AMOUNT');
    await expect(
      router.addLiquidity(
        token0.address,
        token1.address,
        token0Amount,
        token1Amount,
        token0Amount,
        token1Amount,
        wallet.address,
        0,
      ),
    ).to.be.revertedWithCustomError(router, 'Expired');
  });

  it('addLiquidityKLAY', async () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('1');
    const KLAYAmount = ethers.utils.parseEther('4');

    const expectedLiquidity = ethers.utils.parseEther('2');
    const WKLAYPairToken0 = await WKLAYPair.token0();
    await WKLAYPartner.approve(router.address, constants.MaxUint256);
    await expect(
      router.addLiquidityKLAY(
        WKLAYPartner.address,
        WKLAYPartnerAmount,
        WKLAYPartnerAmount,
        KLAYAmount,
        wallet.address,
        constants.MaxUint256,
        { value: KLAYAmount },
      ),
    )
      .to.emit(WKLAYPair, 'Transfer')
      .withArgs(constants.AddressZero, constants.AddressZero, MINIMUM_LIQUIDITY)
      .to.emit(WKLAYPair, 'Transfer')
      .withArgs(constants.AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WKLAYPair, 'Sync')
      .withArgs(
        WKLAYPairToken0 === WKLAYPartner.address ? WKLAYPartnerAmount : KLAYAmount,
        WKLAYPairToken0 === WKLAYPartner.address ? KLAYAmount : WKLAYPartnerAmount,
      )
      .to.emit(WKLAYPair, 'Mint')
      .withArgs(
        router.address,
        WKLAYPairToken0 === WKLAYPartner.address ? WKLAYPartnerAmount : KLAYAmount,
        WKLAYPairToken0 === WKLAYPartner.address ? KLAYAmount : WKLAYPartnerAmount,
      );

    expect(await WKLAYPair.balanceOf(wallet.address))
      .to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY));

    const KlayBalance = await ethers.provider.getBalance(wallet.address);
    await router.addLiquidityKLAY(
      WKLAYPartner.address,
      WKLAYPartnerAmount,
      WKLAYPartnerAmount,
      KLAYAmount,
      wallet.address,
      constants.MaxUint256,
      { value: KlayBalance.div(2) },
    );
    // extra value gets refunded
    expect(await ethers.provider.getBalance(wallet.address))
      .to.be.approximately(KlayBalance.sub(KLAYAmount), ethers.utils.parseEther('0.002'));
  });

  it('removeLiquidity', async () => {
    const token0Amount = ethers.utils.parseEther('1');
    const token1Amount = ethers.utils.parseEther('4');
    await addLiquidity(token0Amount, token1Amount);

    const expectedLiquidity = ethers.utils.parseEther('2');
    await pair.approve(router.address, constants.MaxUint256);
    await expect(
      router.removeLiquidity(
        token0.address,
        token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        wallet.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(pair, 'Transfer')
      .withArgs(wallet.address, pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(pair, 'Transfer')
      .withArgs(pair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, token0Amount.sub(500))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, token1Amount.sub(2000))
      .to.emit(pair, 'Sync')
      .withArgs(500, 2000)
      .to.emit(pair, 'Burn')
      .withArgs(router.address, token0Amount.sub(500), token1Amount.sub(2000), wallet.address);

    expect(await pair.balanceOf(wallet.address)).to.eq(0);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(500));
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(2000));
  });
  it('removeLiquidity:fail', async () => {
    const token0Amount = ethers.utils.parseEther('1');
    const token1Amount = ethers.utils.parseEther('4');
    await addLiquidity(token0Amount, token1Amount);

    const expectedLiquidity = ethers.utils.parseEther('2');
    await pair.approve(router.address, constants.MaxUint256);
    await expect(
      router.removeLiquidity(
        token0.address,
        token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        expectedLiquidity,
        0,
        wallet.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithCustomError(router, 'InsufficientAmount')
      .withArgs('DexRouter: INSUFFICIENT_A_AMOUNT');
    await expect(
      router.removeLiquidity(
        token0.address,
        token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        ethers.utils.parseEther('4'),
        wallet.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithCustomError(router, 'InsufficientAmount')
      .withArgs('DexRouter: INSUFFICIENT_B_AMOUNT');
  });
  it('removeLiquidityKLAY', async () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('1');
    const KLAYAmount = ethers.utils.parseEther('4');
    await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount);
    await WKLAY.deposit({ value: KLAYAmount });
    await WKLAY.transfer(WKLAYPair.address, KLAYAmount);
    await WKLAYPair.mint(wallet.address);

    const expectedLiquidity = ethers.utils.parseEther('2');
    const WKLAYPairToken0 = await WKLAYPair.token0();
    await WKLAYPair.approve(router.address, constants.MaxUint256);
    await expect(
      router.removeLiquidityKLAY(
        WKLAYPartner.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        wallet.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(WKLAYPair, 'Transfer')
      .withArgs(wallet.address, WKLAYPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WKLAYPair, 'Transfer')
      .withArgs(WKLAYPair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(WKLAY, 'Transfer')
      .withArgs(WKLAYPair.address, router.address, KLAYAmount.sub(2000))
      .to.emit(WKLAYPartner, 'Transfer')
      .withArgs(WKLAYPair.address, router.address, WKLAYPartnerAmount.sub(500))
      .to.emit(WKLAYPartner, 'Transfer')
      .withArgs(router.address, wallet.address, WKLAYPartnerAmount.sub(500))
      .to.emit(WKLAYPair, 'Sync')
      .withArgs(
        WKLAYPairToken0 === WKLAYPartner.address ? 500 : 2000,
        WKLAYPairToken0 === WKLAYPartner.address ? 2000 : 500,
      )
      .to.emit(WKLAYPair, 'Burn')
      .withArgs(
        router.address,
        WKLAYPairToken0 === WKLAYPartner.address
          ? WKLAYPartnerAmount.sub(500) : KLAYAmount.sub(2000),
        WKLAYPairToken0 === WKLAYPartner.address
          ? KLAYAmount.sub(2000) : WKLAYPartnerAmount.sub(500),
        router.address,
      );

    expect(await WKLAYPair.balanceOf(wallet.address)).to.eq(0);
    const totalSupplyWKLAYPartner = await WKLAYPartner.totalSupply();
    const totalSupplyWKLAY = await WKLAY.totalSupply();
    expect(await WKLAYPartner.balanceOf(wallet.address)).to.eq(totalSupplyWKLAYPartner.sub(500));
    expect(await WKLAY.balanceOf(wallet.address)).to.eq(totalSupplyWKLAY.sub(2000));
  });

  it('removeLiquidityWithPermit', async () => {
    const token0Amount = ethers.utils.parseEther('1');
    const token1Amount = ethers.utils.parseEther('4');
    await addLiquidity(token0Amount, token1Amount);

    const expectedLiquidity = ethers.utils.parseEther('2');

    const nonce = await pair.nonces(wallet.address);
    const digest = await getPermitSignature(
      wallet,
      pair,
      31337,
      {
        owner: wallet.address,
        spender: router.address,
        value: expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        nonce,
        deadline: constants.MaxUint256,
      },
    );
    const sig = ethers.utils.splitSignature(
      ethers.utils.arrayify(digest),
    );

    await router.removeLiquidityWithPermit(
      token0.address,
      token1.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      0,
      0,
      wallet.address,
      constants.MaxUint256,
      false,
      sig.v,
      sig.r,
      sig.s,
    );
  });

  it('removeLiquidityKLAYWithPermit', async () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('1');
    const KLAYAmount = ethers.utils.parseEther('4');
    await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount);
    await WKLAY.deposit({ value: KLAYAmount });
    await WKLAY.transfer(WKLAYPair.address, KLAYAmount);
    await WKLAYPair.mint(wallet.address);

    const expectedLiquidity = ethers.utils.parseEther('2');

    const nonce = await WKLAYPair.nonces(wallet.address);
    const digest = await getPermitSignature(
      wallet,
      WKLAYPair,
      31337,
      {
        owner: wallet.address,
        spender: router.address,
        value: expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        nonce,
        deadline: constants.MaxUint256,
      },
    );
    const sig = ethers.utils.splitSignature(digest);

    await router.removeLiquidityKLAYWithPermit(
      WKLAYPartner.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      0,
      0,
      wallet.address,
      constants.MaxUint256,
      false,
      sig.v,
      sig.r,
      sig.s,
    );
  });

  describe('swapExactTokensForKLAY', () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('5');
    const KLAYAmount = ethers.utils.parseEther('10');
    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('1662497915624478906');

    beforeEach(async () => {
      await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount);
      await WKLAY.deposit({ value: KLAYAmount });
      await WKLAY.transfer(WKLAYPair.address, KLAYAmount);
      await WKLAYPair.mint(wallet.address);
    });

    it('happy path', async () => {
      await WKLAYPartner.approve(router.address, constants.MaxUint256);
      const WKLAYPairToken0 = await WKLAYPair.token0();
      await expect(
        router.swapExactTokensForKLAY(
          swapAmount,
          0,
          [WKLAYPartner.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
        ),
      ).to.be.revertedWithCustomError(router, 'InvalidPath');
      await expect(
        router.swapExactTokensForKLAY(
          swapAmount,
          KLAYAmount,
          [WKLAYPartner.address, WKLAY.address],
          wallet.address,
          constants.MaxUint256,
        ),
      ).to.be.revertedWithCustomError(router, 'InsufficientAmount')
        .withArgs('DexRouter: INSUFFICIENT_OUTPUT_AMOUNT');
      await expect(
        router.swapExactTokensForKLAY(
          swapAmount,
          0,
          [WKLAYPartner.address, WKLAY.address],
          wallet.address,
          constants.MaxUint256,
        ),
      )
        .to.emit(WKLAYPartner, 'Transfer')
        .withArgs(wallet.address, WKLAYPair.address, swapAmount)
        .to.emit(WKLAY, 'Transfer')
        .withArgs(WKLAYPair.address, router.address, expectedOutputAmount)
        .to.emit(WKLAYPair, 'Sync')
        .withArgs(
          WKLAYPairToken0 === WKLAYPartner.address
            ? WKLAYPartnerAmount.add(swapAmount)
            : KLAYAmount.sub(expectedOutputAmount),
          WKLAYPairToken0 === WKLAYPartner.address
            ? KLAYAmount.sub(expectedOutputAmount)
            : WKLAYPartnerAmount.add(swapAmount),
        )
        .to.emit(WKLAYPair, 'Swap')
        .withArgs(
          router.address,
          WKLAYPairToken0 === WKLAYPartner.address ? swapAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : swapAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : expectedOutputAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? expectedOutputAmount : 0,
          router.address,
        );
    });
  });

  describe('swapKLAYForExactTokens', () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('10');
    const KLAYAmount = ethers.utils.parseEther('5');
    const expectedSwapAmount = BigNumber.from('557227237267357629');
    const outputAmount = ethers.utils.parseEther('1');

    beforeEach(async () => {
      await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount);
      await WKLAY.deposit({ value: KLAYAmount });
      await WKLAY.transfer(WKLAYPair.address, KLAYAmount);
      await WKLAYPair.mint(wallet.address);
    });

    it('happy path', async () => {
      const WKLAYPairToken0 = await WKLAYPair.token0();
      await expect(
        router.swapKLAYForExactTokens(
          outputAmount,
          [WKLAYPartner.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: expectedSwapAmount,
          },
        ),
      ).to.be.revertedWithCustomError(router, 'InvalidPath');
      await expect(
        router.swapKLAYForExactTokens(
          outputAmount,
          [WKLAY.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: 5,
          },
        ),
      ).to.be.revertedWithCustomError(router, 'ExcessiveInputAmount');
      await expect(
        router.swapKLAYForExactTokens(
          outputAmount,
          [WKLAY.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: expectedSwapAmount,
          },
        ),
      )
        .to.emit(WKLAY, 'Transfer')
        .withArgs(router.address, WKLAYPair.address, expectedSwapAmount)
        .to.emit(WKLAYPartner, 'Transfer')
        .withArgs(WKLAYPair.address, wallet.address, outputAmount)
        .to.emit(WKLAYPair, 'Sync')
        .withArgs(
          WKLAYPairToken0 === WKLAYPartner.address
            ? WKLAYPartnerAmount.sub(outputAmount)
            : KLAYAmount.add(expectedSwapAmount),
          WKLAYPairToken0 === WKLAYPartner.address
            ? KLAYAmount.add(expectedSwapAmount)
            : WKLAYPartnerAmount.sub(outputAmount),
        )
        .to.emit(WKLAYPair, 'Swap')
        .withArgs(
          router.address,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : expectedSwapAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? expectedSwapAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? outputAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : outputAmount,
          wallet.address,
        );
    });

    it('happy path with extra KLAY', async () => {
      const WKLAYPairToken0 = await WKLAYPair.token0();
      await expect(
        router.swapKLAYForExactTokens(
          outputAmount,
          [WKLAY.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: expectedSwapAmount.mul(50),
          },
        ),
      )
        .to.emit(WKLAY, 'Transfer')
        .withArgs(router.address, WKLAYPair.address, expectedSwapAmount)
        .to.emit(WKLAYPartner, 'Transfer')
        .withArgs(WKLAYPair.address, wallet.address, outputAmount)
        .to.emit(WKLAYPair, 'Sync')
        .withArgs(
          WKLAYPairToken0 === WKLAYPartner.address
            ? WKLAYPartnerAmount.sub(outputAmount)
            : KLAYAmount.add(expectedSwapAmount),
          WKLAYPairToken0 === WKLAYPartner.address
            ? KLAYAmount.add(expectedSwapAmount)
            : WKLAYPartnerAmount.sub(outputAmount),
        )
        .to.emit(WKLAYPair, 'Swap')
        .withArgs(
          router.address,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : expectedSwapAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? expectedSwapAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? outputAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : outputAmount,
          wallet.address,
        );
    });
  });

  describe('swapExactKLAYForTokens', () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('10');
    const KLAYAmount = ethers.utils.parseEther('5');
    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('1662497915624478906');

    beforeEach(async () => {
      await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount);
      await WKLAY.deposit({ value: KLAYAmount });
      await WKLAY.transfer(WKLAYPair.address, KLAYAmount);
      await WKLAYPair.mint(wallet.address);

      await token0.approve(router.address, constants.MaxUint256);
    });

    it('happy path', async () => {
      const WKLAYPairToken0 = await WKLAYPair.token0();
      await expect(
        router.swapExactKLAYForTokens(
          0,
          [WKLAYPartner.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: swapAmount,
          },
        ),
      ).to.be.revertedWithCustomError(router, 'InvalidPath');
      await expect(
        router.swapExactKLAYForTokens(
          swapAmount,
          [WKLAY.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: 1,
          },
        ),
      ).to.be.revertedWithCustomError(router, 'InsufficientAmount')
        .withArgs('DexRouter: INSUFFICIENT_OUTPUT_AMOUNT');
      await expect(
        router.swapExactKLAYForTokens(
          0,
          [WKLAY.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
          {
            value: swapAmount,
          },
        ),
      )
        .to.emit(WKLAY, 'Transfer')
        .withArgs(router.address, WKLAYPair.address, swapAmount)
        .to.emit(WKLAYPartner, 'Transfer')
        .withArgs(WKLAYPair.address, wallet.address, expectedOutputAmount)
        .to.emit(WKLAYPair, 'Sync')
        .withArgs(
          WKLAYPairToken0 === WKLAYPartner.address
            ? WKLAYPartnerAmount.sub(expectedOutputAmount)
            : KLAYAmount.add(swapAmount),
          WKLAYPairToken0 === WKLAYPartner.address
            ? KLAYAmount.add(swapAmount)
            : WKLAYPartnerAmount.sub(expectedOutputAmount),
        )
        .to.emit(WKLAYPair, 'Swap')
        .withArgs(
          router.address,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : swapAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? swapAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? expectedOutputAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : expectedOutputAmount,
          wallet.address,
        );
    });

    it('gas [ @skip-on-coverage ]', async () => {
      const WKLAYPartnerAmount2 = ethers.utils.parseEther('10');
      const KLAYAmount2 = ethers.utils.parseEther('5');
      await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount2);
      await WKLAY.deposit({ value: KLAYAmount2 });
      await WKLAY.transfer(WKLAYPair.address, KLAYAmount2);
      await WKLAYPair.mint(wallet.address);

      // ensure that setting price{0,1}
      // CumulativeLast for the first time doesn't affect our gas math
      await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1);
      await pair.sync();

      const swapAmount2 = ethers.utils.parseEther('1');
      await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1);
      const tx = await router.swapExactKLAYForTokens(
        0,
        [WKLAY.address, WKLAYPartner.address],
        wallet.address,
        constants.MaxUint256,
        {
          value: swapAmount2,
        },
      );
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.eq(104286);
    }).retries(3);
  });

  describe('swapTokensForExactKLAY', () => {
    const WKLAYPartnerAmount = ethers.utils.parseEther('5');
    const KLAYAmount = ethers.utils.parseEther('10');
    const expectedSwapAmount = BigNumber.from('557227237267357629');
    const outputAmount = ethers.utils.parseEther('1');

    beforeEach(async () => {
      await WKLAYPartner.transfer(WKLAYPair.address, WKLAYPartnerAmount);
      await WKLAY.deposit({ value: KLAYAmount });
      await WKLAY.transfer(WKLAYPair.address, KLAYAmount);
      await WKLAYPair.mint(wallet.address);
    });

    it('happy path', async () => {
      await WKLAYPartner.approve(router.address, constants.MaxUint256);
      const WKLAYPairToken0 = await WKLAYPair.token0();
      await expect(
        router.swapTokensForExactKLAY(
          outputAmount,
          constants.Zero,
          [WKLAYPartner.address, WKLAY.address],
          wallet.address,
          constants.MaxUint256,
        ),
      ).to.be.revertedWithCustomError(router, 'ExcessiveInputAmount');
      await expect(
        router.swapTokensForExactKLAY(
          outputAmount,
          constants.MaxUint256,
          [WKLAYPartner.address, WKLAYPartner.address],
          wallet.address,
          constants.MaxUint256,
        ),
      ).to.be.revertedWithCustomError(router, 'InvalidPath');
      await expect(
        router.swapTokensForExactKLAY(
          outputAmount,
          constants.MaxUint256,
          [WKLAYPartner.address, WKLAY.address],
          wallet.address,
          constants.MaxUint256,
        ),
      )
        .to.emit(WKLAYPartner, 'Transfer')
        .withArgs(wallet.address, WKLAYPair.address, expectedSwapAmount)
        .to.emit(WKLAY, 'Transfer')
        .withArgs(WKLAYPair.address, router.address, outputAmount)
        .to.emit(WKLAYPair, 'Sync')
        .withArgs(
          WKLAYPairToken0 === WKLAYPartner.address
            ? WKLAYPartnerAmount.add(expectedSwapAmount)
            : KLAYAmount.sub(outputAmount),
          WKLAYPairToken0 === WKLAYPartner.address
            ? KLAYAmount.sub(outputAmount)
            : WKLAYPartnerAmount.add(expectedSwapAmount),
        )
        .to.emit(WKLAYPair, 'Swap')
        .withArgs(
          router.address,
          WKLAYPairToken0 === WKLAYPartner.address ? expectedSwapAmount : 0,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : expectedSwapAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? 0 : outputAmount,
          WKLAYPairToken0 === WKLAYPartner.address ? outputAmount : 0,
          router.address,
        );
    });
  });

  describe('swapExactTokensForTokens', () => {
    const token0Amount = ethers.utils.parseEther('5');
    const token1Amount = ethers.utils.parseEther('10');
    const swapAmount = ethers.utils.parseEther('1');
    const expectedOutputAmount = BigNumber.from('1662497915624478906');

    beforeEach(async () => {
      await addLiquidity(token0Amount, token1Amount);
      await token0.approve(router.address, constants.MaxUint256);
    });

    it('happy path', async () => {
      await expect(
        router.swapExactTokensForTokens(
          swapAmount,
          0,
          [token0.address, token1.address],
          wallet.address,
          constants.MaxUint256,
        ),
      )
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pair.address, swapAmount)
        .to.emit(token1, 'Transfer')
        .withArgs(pair.address, wallet.address, expectedOutputAmount)
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
        .to.emit(pair, 'Swap')
        .withArgs(router.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address);
    });

    it('gas [ @skip-on-coverage ]', async () => {
      await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1);
      await pair.sync();

      await token0.approve(router.address, constants.MaxUint256);
      await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1);
      const tx = await router.swapExactTokensForTokens(
        swapAmount,
        0,
        [token0.address, token1.address],
        wallet.address,
        constants.MaxUint256,
      );
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.eq(101562);
    }).retries(3);
  });

  describe('swapTokensForExactTokens', () => {
    const token0Amount = ethers.utils.parseEther('5');
    const token1Amount = ethers.utils.parseEther('10');
    const expectedSwapAmount = BigNumber.from('557227237267357629');
    const outputAmount = ethers.utils.parseEther('1');

    beforeEach(async () => {
      await addLiquidity(token0Amount, token1Amount);
    });

    it('happy path', async () => {
      await token0.approve(router.address, constants.MaxUint256);
      await expect(
        router.swapTokensForExactTokens(
          outputAmount,
          constants.Zero,
          [token0.address, token1.address],
          wallet.address,
          constants.MaxUint256,
        ),
      )
        .to.be.revertedWithCustomError(router, 'ExcessiveInputAmount');
      await expect(
        router.swapTokensForExactTokens(
          outputAmount,
          constants.MaxUint256,
          [token0.address, token1.address],
          wallet.address,
          constants.MaxUint256,
        ),
      )
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pair.address, expectedSwapAmount)
        .to.emit(token1, 'Transfer')
        .withArgs(pair.address, wallet.address, outputAmount)
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount.add(expectedSwapAmount), token1Amount.sub(outputAmount))
        .to.emit(pair, 'Swap')
        .withArgs(router.address, expectedSwapAmount, 0, 0, outputAmount, wallet.address);
    });
  });
});

describe('DexRouter fee-on-transfer tokens', async () => {
  let wallet : SignerWithAddress;
  let DTT: Contract;
  let WKLAY: Contract;
  let router: Contract;
  let factory: Contract;
  let pair: Contract;
  beforeEach(async () => {
    [wallet] = await ethers.getSigners();
    const fixture = await routerFixture(wallet);

    WKLAY = fixture.WKLAY;
    router = fixture.router;
    factory = fixture.factory;

    const DTTFactory = await ethers.getContractFactory('DeflKIP7');
    DTT = await DTTFactory.deploy(ethers.utils.parseEther('10000'));

    // make a DTT<>WKLAY pair
    await factory.createPair(DTT.address, WKLAY.address);
    const pairAddress = await factory.getPair(DTT.address, WKLAY.address);
    pair = await ethers.getContractAt('DexPair', pairAddress);
  });

  afterEach(async () => {
    expect(await ethers.provider.getBalance(router.address)).to.eq(0);
  });

  async function addLiquidity(DTTAmount: BigNumber, WKLAYAmount: BigNumber) {
    await DTT.approve(router.address, constants.MaxUint256);
    await router.addLiquidityKLAY(
      DTT.address,
      DTTAmount,
      DTTAmount,
      WKLAYAmount,
      wallet.address,
      constants.MaxUint256,
      {
        value: WKLAYAmount,
      },
    );
  }

  it('removeLiquidityKLAYSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = ethers.utils.parseEther('1');
    const KLAYAmount = ethers.utils.parseEther('4');
    await addLiquidity(DTTAmount, KLAYAmount);

    const DTTInPair = await DTT.balanceOf(pair.address);
    const WKLAYInPair = await WKLAY.balanceOf(pair.address);
    const liquidity = await pair.balanceOf(wallet.address);
    const totalSupply = await pair.totalSupply();
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply);
    const WKLAYExpected = WKLAYInPair.mul(liquidity).div(totalSupply);

    await pair.approve(router.address, constants.MaxUint256);
    await router.removeLiquidityKLAYSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WKLAYExpected,
      wallet.address,
      constants.MaxUint256,
    );
  });

  it('removeLiquidityKLAYWithPermitSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = ethers.utils.parseEther('1')
      .mul(100)
      .div(99);
    const KLAYAmount = ethers.utils.parseEther('4');
    await addLiquidity(DTTAmount, KLAYAmount);

    const nonce = await pair.nonces(wallet.address);
    const digest = await getPermitSignature(
      wallet,
      pair,
      31337,
      {
        owner: wallet.address,
        spender: router.address,
        value: await pair.balanceOf(wallet.address),
        nonce,
        deadline: constants.MaxUint256,
      },
    );
    const sig = ethers.utils.splitSignature(digest);

    const DTTInPair = await DTT.balanceOf(pair.address);
    const WKLAYInPair = await WKLAY.balanceOf(pair.address);
    const liquidity = await pair.balanceOf(wallet.address);
    const totalSupply = await pair.totalSupply();
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply);
    const WKLAYExpected = WKLAYInPair.mul(liquidity).div(totalSupply);

    await pair.approve(router.address, constants.MaxUint256);
    await router.removeLiquidityKLAYWithPermitSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WKLAYExpected,
      wallet.address,
      constants.MaxUint256,
      false,
      sig.v,
      sig.r,
      sig.s,
    );
  });

  describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
    const DTTAmount = ethers.utils.parseEther('5')
      .mul(100)
      .div(99);
    const KLAYAmount = ethers.utils.parseEther('10');
    const amountIn = ethers.utils.parseEther('1');

    beforeEach(async () => {
      await addLiquidity(DTTAmount, KLAYAmount);
    });

    it('DTT -> WKLAY', async () => {
      await DTT.approve(router.address, constants.MaxUint256);

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [DTT.address, WKLAY.address],
        wallet.address,
        constants.MaxUint256,
      );
    });

    // WKLAY -> DTT
    it('WKLAY -> DTT', async () => {
      await WKLAY.deposit({ value: amountIn }); // mint WKLAY
      await WKLAY.approve(router.address, constants.MaxUint256);

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [WKLAY.address, DTT.address],
        wallet.address,
        constants.MaxUint256,
      );
    });
  });

  // KLAY -> DTT
  it('swapExactKLAYForTokensSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = ethers.utils.parseEther('10')
      .mul(100)
      .div(99);
    const KLAYAmount = ethers.utils.parseEther('5');
    const swapAmount = ethers.utils.parseEther('1');
    await addLiquidity(DTTAmount, KLAYAmount);

    await expect(router.swapExactKLAYForTokensSupportingFeeOnTransferTokens(
      0,
      [DTT.address, constants.AddressZero],
      wallet.address,
      constants.MaxUint256,
      {
        value: swapAmount,
      },
    )).to.be.revertedWithCustomError(router, 'InvalidPath');

    await router.swapExactKLAYForTokensSupportingFeeOnTransferTokens(
      0,
      [WKLAY.address, DTT.address],
      wallet.address,
      constants.MaxUint256,
      {
        value: swapAmount,
      },
    );
  });

  // DTT -> KLAY
  it('swapExactTokensForKLAYSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = ethers.utils.parseEther('5')
      .mul(100)
      .div(99);
    const KLAYAmount = ethers.utils.parseEther('10');
    const swapAmount = ethers.utils.parseEther('1');

    await addLiquidity(DTTAmount, KLAYAmount);
    await DTT.approve(router.address, constants.MaxUint256);

    await expect(router.swapExactTokensForKLAYSupportingFeeOnTransferTokens(
      swapAmount,
      0,
      [WKLAY.address, DTT.address],
      wallet.address,
      constants.MaxUint256,
    )).to.be.revertedWithCustomError(router, 'InvalidPath');

    await router.swapExactTokensForKLAYSupportingFeeOnTransferTokens(
      swapAmount,
      0,
      [DTT.address, WKLAY.address],
      wallet.address,
      constants.MaxUint256,
    );
  });
});

describe('DexRouter fee-on-transfer tokens: reloaded', async () => {
  let wallet: SignerWithAddress;
  let DTT: Contract;
  let DTT2: Contract;
  let router: Contract;
  beforeEach(async () => {
    [wallet] = await ethers.getSigners();
    const fixture = await routerFixture(wallet);
    router = fixture.router;

    const DTTFactory = await ethers.getContractFactory('DeflKIP7');
    DTT = await DTTFactory.deploy(ethers.utils.parseEther('10000'));
    DTT2 = await DTTFactory.deploy(ethers.utils.parseEther('10000'));

    // make a DTT<>WKLAY pair
    await fixture.factory.createPair(DTT.address, DTT2.address);
    const pairAddress = await fixture.factory.getPair(DTT.address, DTT2.address);
    console.log(pairAddress);
  });

  afterEach(async () => {
    expect(await ethers.provider.getBalance(router.address)).to.eq(0);
  });

  async function addLiquidity(DTTAmount: BigNumber, DTT2Amount: BigNumber) {
    await DTT.approve(router.address, constants.MaxUint256);
    await DTT2.approve(router.address, constants.MaxUint256);
    await router.addLiquidity(
      DTT.address,
      DTT2.address,
      DTTAmount,
      DTT2Amount,
      DTTAmount,
      DTT2Amount,
      wallet.address,
      constants.MaxUint256,
    );
  }

  describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
    const DTTAmount = ethers.utils.parseEther('5')
      .mul(100)
      .div(99);
    const DTT2Amount = ethers.utils.parseEther('5');
    const amountIn = ethers.utils.parseEther('1');

    beforeEach(async () => {
      await addLiquidity(DTTAmount, DTT2Amount);
    });

    it('DTT -> DTT2', async () => {
      await DTT.approve(router.address, constants.MaxUint256);

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [DTT.address, DTT2.address],
        wallet.address,
        constants.MaxUint256,
      );
    });
  });
});
