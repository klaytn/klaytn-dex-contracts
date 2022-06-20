import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract, BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('PlatformToken', () => {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let token: Contract;

  before(async () => {
    [alice, bob, carol] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const TokenFactory = await ethers.getContractFactory('PlatformToken');
    token = await TokenFactory.deploy('Platform Token', 'PTN', alice.address);
    await token.grantRole((await token.MINTER_ROLE()), alice.address);
    await token.deployed();
  });

  it('initial nonce is 0', async () => {
    expect(await token.nonces(alice.address)).to.be.equal(0);
  });

  it('minting restriction', async () => {
    const amount = BigNumber.from('2').pow(BigNumber.from('224'));
    await expect(token.mint(alice.address, amount)).to.be.revertedWith(
      'KIP7Votes: total supply risks overflowing votes',
    );
  });

  it('should have correct name and symbol and decimal', async () => {
    expect(await token.name()).to.be.equal('Platform Token');
    expect(await token.symbol()).to.be.equal('PTN');
    expect(await token.decimals()).to.be.equal(18);
  });

  it('should only allow owner to mint token', async () => {
    await token.mint(alice.address, '100');
    await token.mint(bob.address, '1000');
    await expect(token.connect(bob).mint(carol.address, '1000', { from: bob.address })).to.be.revertedWith(
      'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
    );
    const totalSupply = await token.totalSupply();
    const aliceBal = await token.balanceOf(alice.address);
    const bobBal = await token.balanceOf(bob.address);
    const carolBal = await token.balanceOf(carol.address);
    expect(totalSupply).to.equal('1100');
    expect(aliceBal).to.equal('100');
    expect(bobBal).to.equal('1000');
    expect(carolBal).to.equal('0');
  });

  it('should supply token transfers properly', async () => {
    await token.mint(alice.address, '100');
    await token.mint(bob.address, '1000');
    await token.transfer(carol.address, '10');
    await token.connect(bob).transfer(carol.address, '100', {
      from: bob.address,
    });
    const totalSupply = await token.totalSupply();
    const aliceBal = await token.balanceOf(alice.address);
    const bobBal = await token.balanceOf(bob.address);
    const carolBal = await token.balanceOf(carol.address);
    expect(totalSupply, '1100');
    expect(aliceBal, '90');
    expect(bobBal, '900');
    expect(carolBal, '110');
  });

  it('should fail if you try to do bad transfers', async () => {
    await token.mint(alice.address, '100');
    await expect(token.transfer(carol.address, '110')).to.be.revertedWith('KIP7: transfer amount exceeds balance');
    await expect(token.connect(bob).transfer(carol.address, '1', { from: bob.address })).to.be.revertedWith(
      'KIP7: transfer amount exceeds balance',
    );
  });
});
