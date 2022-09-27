import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { getCreate2Address } from '../shared/utilities';
import { factoryFixture } from '../shared/fixtures';

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000',
];

describe('DexFactory', () => {
  let wallet: SignerWithAddress;
  let other: SignerWithAddress;
  let factory: Contract;
  beforeEach(async () => {
    [wallet, other] = await ethers.getSigners();
    factory = (await factoryFixture(wallet)).factory;
  });

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(constants.AddressZero);
    expect(await factory.feeToSetter()).to.eq(await wallet.getAddress());
    expect(await factory.allPairsLength()).to.eq(0);
    console.log(await factory.INIT());
  });

  async function createPair(tokens: [string, string]) {
    const bytecode = await (await ethers.getContractFactory('DexPair')).bytecode;
    const create2Address = getCreate2Address(factory.address, tokens, bytecode);
    await expect(factory.createPair(...tokens))
      .to.emit(factory, 'PairCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, 1);

    await expect(factory.createPair(...tokens)).to.be
      .revertedWithCustomError(factory, 'InvalidAddressParameters')
      .withArgs('DEX: PAIR_EXISTS'); // DEX: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice()
      .reverse())).to.be.revertedWithCustomError(factory, 'InvalidAddressParameters')
      .withArgs('DEX: PAIR_EXISTS'); // DEX: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address);
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address);
    expect(await factory.allPairs(0)).to.eq(create2Address);
    expect(await factory.allPairsLength()).to.eq(1);

    const pair = await ethers.getContractAt('DexPair', create2Address);
    expect(await pair.factory()).to.eq(factory.address);
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0]);
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1]);
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES);
  });

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string]);
  });

  it('createPair:identical', async () => {
    await expect(createPair([TEST_ADDRESSES[0], TEST_ADDRESSES[0]] as [string, string])).to.be
      .revertedWithCustomError(factory, 'InvalidAddressParameters').withArgs('DEX: IDENTICAL_ADDRESSES');
  });

  it('createPair:zero address', async () => {
    await expect(createPair([constants.AddressZero, TEST_ADDRESSES[0]] as [string, string])).to.be
      .revertedWithCustomError(factory, 'InvalidAddressParameters')
      .withArgs('DEX: ZERO_ADDRESS');
    await expect(createPair([TEST_ADDRESSES[0], constants.AddressZero] as [string, string])).to.be
      .revertedWithCustomError(factory, 'InvalidAddressParameters')
      .withArgs('DEX: ZERO_ADDRESS');
    await expect(createPair([constants.AddressZero, constants.AddressZero] as [string, string]))
      .to.be.revertedWithCustomError(factory, 'InvalidAddressParameters')
      .withArgs('DEX: IDENTICAL_ADDRESSES');
  });

  it('createPair:gas [ @skip-on-coverage ]', async () => {
    const tx = await factory.createPair(...TEST_ADDRESSES);
    const receipt = await tx.wait();
    expect(receipt.gasUsed).to.eq(2198483);
  });

  it('setFeeTo', async () => {
    await expect(factory.connect(other).setFeeTo(other.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
    await factory.setFeeTo(wallet.address);
    expect(await factory.feeTo()).to.eq(wallet.address);
  });

  it('setFeeToSetter', async () => {
    await expect(factory.connect(other).setFeeToSetter(other.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
    await factory.setFeeToSetter(other.address);
    expect(await factory.feeToSetter()).to.eq(other.address);
    await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
  });
});
