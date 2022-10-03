import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { PlatformToken } from '../typechain/contracts/tokens/PlatformToken';

describe('PlatformToken', () => {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let other: SignerWithAddress;
  let multisig: SignerWithAddress;
  let token: PlatformToken;
  const supply = BigNumber.from('10000000000000000000000000');

  before(async () => {
    [alice, bob, carol, other, multisig] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const TokenFactory = await ethers.getContractFactory('PlatformToken');
    token = await TokenFactory.deploy('Platform Token', 'PTN', multisig.address);
    await token.connect(multisig).grantRole((await token.MINTER_ROLE()), alice.address);
    await token.connect(multisig).grantRole((await token.BURNER_ROLE()), alice.address);
    await token.deployed();
  });

  it('deploy:fail, multisig cannot be the zero address', async () => {
    const ptn = await ethers.getContractFactory('PlatformToken');
    await expect(ptn.deploy('Platform Token', 'PTN', constants.AddressZero))
      .to.be.revertedWith('Multisig cannot be the zero address');
  });

  it('initial nonce is 0', async () => {
    expect(await token.nonces(alice.address)).to.be.equal(0);
  });

  it('supportInterface', async () => {
    // KIP-13 Identifiers can be found https://kips.klaytn.foundation/KIPs/kip-7
    expect(await token.supportsInterface('0x65787371')).to.eq(true); // 0x65787371 is IKIP7 interfaceID
    expect(await token.supportsInterface('0xa219a025')).to.eq(true); // 0xa219a025 is IKIP7Metadata interfaceID
    expect(await token.supportsInterface('0xe90b74c5')).to.eq(true); // 0xe90b74c5 is IPlatformToken interfaceID
    expect(await token.supportsInterface('0x9d188c22')).to.eq(false); // 0x9d188c22 is IKIP7TokenReceiver interfaceID
  });

  it('chainID', async () => {
    expect(await token.getChainId()).to.eq(31337); // hardhat chainID
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
  describe('Compound test suite', () => {
    describe('balanceOf', () => {
      it('grants to initial account', async () => {
        await token.mint(alice.address, supply);
        expect(await token.balanceOf(alice.address)).to.be.equal('10000000000000000000000000');
      });
    });

    describe('numCheckpoints', () => {
      it('returns the number of checkpoints for a delegate', async () => {
        await token.mint(alice.address, supply);
        await token.transfer(bob.address, '100'); // give an account a few tokens for readability
        expect(await token.numCheckpoints(carol.address)).to.be.equal(0);

        const t1 = await (await token.connect(bob).delegate(carol.address)).wait();
        expect(await token.numCheckpoints(carol.address)).to.be.equal(1);

        const t2 = await (await token.connect(bob).transfer(other.address, '10')).wait();
        expect(await token.numCheckpoints(carol.address)).to.be.equal(2);

        const t3 = await (await token.connect(bob).transfer(other.address, '10')).wait();
        expect(await token.numCheckpoints(carol.address)).to.be.equal(3);

        const t4 = await (await token.transfer(bob.address, '20')).wait();
        expect(await token.numCheckpoints(carol.address)).to.be.equal(4);

        expect(await token.checkpoints(carol.address, 0)).to.be.deep.equal([t1.blockNumber.toString(), '100']);
        expect(await token.checkpoints(carol.address, 1)).to.be.deep.equal([t2.blockNumber.toString(), '90']);
        expect(await token.checkpoints(carol.address, 2)).to.be.deep.equal([t3.blockNumber.toString(), '80']);
        expect(await token.checkpoints(carol.address, 3)).to.be.deep.equal([t4.blockNumber.toString(), '100']);

        await time.advanceBlock();
        expect(await token.getPastVotes(carol.address, t1.blockNumber)).to.be.equal('100');
        expect(await token.getPastVotes(carol.address, t2.blockNumber)).to.be.equal('90');
        expect(await token.getPastVotes(carol.address, t3.blockNumber)).to.be.equal('80');
        expect(await token.getPastVotes(carol.address, t4.blockNumber)).to.be.equal('100');
      });

      it('does not add more than one checkpoint in a block', async () => {
        await token.mint(alice.address, supply);
        await token.transfer(bob.address, '100');
        expect(await token.numCheckpoints(carol.address)).to.be.equal(0);

        const t1 = await (await token.connect(bob).delegate(carol.address)).wait();
        expect(await token.numCheckpoints(carol.address)).to.be.equal(1);
        expect(await token.checkpoints(carol.address, 0)).to.be.deep.equal([t1.blockNumber, BigNumber.from('100')]);

        const t4 = await (await token.transfer(bob.address, 20)).wait();
        expect(await token.numCheckpoints(carol.address)).to.be.equal(2);
        expect(await token.checkpoints(carol.address, 1)).to.be.deep.equal([t4.blockNumber, BigNumber.from('120')]);
      });
    });

    describe('getPastVotes', () => {
      it('reverts if block number >= current block', async () => {
        await token.mint(alice.address, supply);
        await expect(
          token.getPastVotes(carol.address, 5e10),
        ).to.be.revertedWith('KIP7Votes: block not yet mined');

        it('returns 0 if there are no checkpoints', async () => {
          expect(await token.getPastVotes(carol.address, 0)).to.be.equal('0');
        });

        it('returns the latest block if >= last checkpoint block', async () => {
          const t1 = await (await token.delegate(carol.address)).wait();
          await time.advanceBlock();
          await time.advanceBlock();

          expect(await token.getPastVotes(carol.address, t1.blockNumber)).to.be.equal('10000000000000000000000000');
          expect(await token.getPastVotes(carol.address, t1.blockNumber + 1)).to.be.equal('10000000000000000000000000');
        });

        it('returns zero if < first checkpoint block', async () => {
          await token.mint(alice.address, supply);
          await time.advanceBlock();
          const t1 = await (await token.delegate(carol.address)).wait();
          await time.advanceBlock();
          await time.advanceBlock();

          expect(await token.getPastVotes(carol.address, t1.blockNumber - 1)).to.be.equal('0');
          expect(await token.getPastVotes(carol.address, t1.blockNumber + 1)).to.be.equal('10000000000000000000000000');
        });

        it('generally returns the voting balance at the appropriate checkpoint', async () => {
          await token.mint(alice.address, supply);
          const t1 = await (await token.delegate(carol.address)).wait();
          await time.advanceBlock();
          await time.advanceBlock();
          const t2 = await (await token.transfer(carol.address, 10)).wait();
          await time.advanceBlock();
          await time.advanceBlock();
          const t3 = await (await token.transfer(carol.address, 10)).wait();
          await time.advanceBlock();
          await time.advanceBlock();
          const t4 = await (await token.transfer(
            alice.address,
            20,
            { from: other.address },
          )).wait();
          await time.advanceBlock();
          await time.advanceBlock();

          expect(await token.getPastVotes(carol.address, t1.blockNumber - 1)).to.be.equal('0');
          expect(await token.getPastVotes(carol.address, t1.blockNumber)).to.be.equal('10000000000000000000000000');
          expect(await token.getPastVotes(carol.address, t1.blockNumber + 1)).to.be.equal('10000000000000000000000000');
          expect(await token.getPastVotes(carol.address, t2.blockNumber)).to.be.equal('9999999999999999999999990');
          expect(await token.getPastVotes(carol.address, t2.blockNumber + 1)).to.be.equal('9999999999999999999999990');
          expect(await token.getPastVotes(carol.address, t3.blockNumber)).to.be.equal('9999999999999999999999980');
          expect(await token.getPastVotes(carol.address, t3.blockNumber + 1)).to.be.equal('9999999999999999999999980');
          expect(await token.getPastVotes(carol.address, t4.blockNumber)).to.be.equal('10000000000000000000000000');
          expect(await token.getPastVotes(carol.address, t4.blockNumber + 1)).to.be.equal('10000000000000000000000000');
        });
      });
    });

    describe('getPastTotalSupply', () => {
      beforeEach(async () => {
        await token.delegate(alice.address);
      });

      it('reverts if block number >= current block', async () => {
        await expect(
          token.getPastTotalSupply(5e10),
        ).to.be.rejectedWith('KIP7Votes: block not yet mined');
      });

      it('returns 0 if there are no checkpoints', async () => {
        expect(await token.getPastTotalSupply(0)).to.be.equal('0');
      });

      it('returns the latest block if >= last checkpoint block', async () => {
        const t1 = await (await token.mint(alice.address, supply)).wait();

        await time.advanceBlock();
        await time.advanceBlock();

        expect(await token.getPastTotalSupply(t1.blockNumber)).to.be.equal(supply);
        expect(await token.getPastTotalSupply(t1.blockNumber + 1)).to.be.equal(supply);
      });

      it('returns zero if < first checkpoint block', async () => {
        await time.advanceBlock();
        const t1 = await (await token.mint(alice.address, supply)).wait();
        await time.advanceBlock();
        await time.advanceBlock();

        expect(await token.getPastTotalSupply(t1.blockNumber - 1)).to.be.equal('0');
        expect(await token.getPastTotalSupply(t1.blockNumber + 1)).to.be.equal('10000000000000000000000000');
      });

      it('generally returns the voting balance at the appropriate checkpoint', async () => {
        const t1 = await (await token.mint(alice.address, supply)).wait();
        await time.advanceBlock();
        await time.advanceBlock();
        const t2 = await (await token.burn(alice.address, 10)).wait();
        await time.advanceBlock();
        await time.advanceBlock();
        const t3 = await (await token.burn(alice.address, 10)).wait();
        await time.advanceBlock();
        await time.advanceBlock();
        const t4 = await (await token.mint(alice.address, 20)).wait();
        await time.advanceBlock();
        await time.advanceBlock();

        expect(await token.getPastTotalSupply(t1.blockNumber - 1)).to.be.equal('0');
        expect(await token.getPastTotalSupply(t1.blockNumber)).to.be.equal('10000000000000000000000000');
        expect(await token.getPastTotalSupply(t1.blockNumber + 1)).to.be.equal('10000000000000000000000000');
        expect(await token.getPastTotalSupply(t2.blockNumber)).to.be.equal('9999999999999999999999990');
        expect(await token.getPastTotalSupply(t2.blockNumber + 1)).to.be.equal('9999999999999999999999990');
        expect(await token.getPastTotalSupply(t3.blockNumber)).to.be.equal('9999999999999999999999980');
        expect(await token.getPastTotalSupply(t3.blockNumber + 1)).to.be.equal('9999999999999999999999980');
        expect(await token.getPastTotalSupply(t4.blockNumber)).to.be.equal('10000000000000000000000000');
        expect(await token.getPastTotalSupply(t4.blockNumber + 1)).to.be.equal('10000000000000000000000000');
      });
    });
  });
});
