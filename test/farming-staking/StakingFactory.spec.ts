/* eslint-disable no-await-in-loop */
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect, assert } from 'chai';
import { StakingFactory__factory } from '../../typechain/factories/farming/StakingFactory__factory';
import { KIP7Mock__factory } from '../../typechain/factories/mocks/KIP7TestMock.sol/KIP7Mock__factory';
import { StakingFactory } from '../../typechain/farming/StakingFactory';
import { StakingInitializable } from '../../typechain/farming/StakingFactoryPool.sol/StakingInitializable';
import { KIP7Mock } from '../../typechain/mocks/KIP7TestMock.sol/KIP7Mock';
import { advanceBlockTo } from '../shared/utilities';

describe('StakingFactory', () => {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let david: SignerWithAddress;
  let erin: SignerWithAddress;
  let StakingPoolFactory: StakingFactory__factory;
  let MockERC20: KIP7Mock__factory;
  let blockNumber: number;
  let startBlock: BigNumber;
  let endBlock: BigNumber;

  const poolLimitPerUser = parseEther('0');
  const rewardPerBlock = parseEther('10');

  // Contracts
  let fakePtn: KIP7Mock;
  let mockPTN: KIP7Mock;
  let mockPT: KIP7Mock;
  let staking: StakingInitializable;
  let stakingFactory: StakingFactory;

  before(async () => {
    [alice, bob, carol, david, erin] = await ethers.getSigners();
    StakingPoolFactory = await ethers.getContractFactory('StakingFactory');
    MockERC20 = await ethers.getContractFactory('KIP7Mock');
    blockNumber = await ethers.provider.getBlockNumber();
    startBlock = ethers.BigNumber.from(blockNumber).add(ethers.BigNumber.from(100));
    endBlock = ethers.BigNumber.from(blockNumber).add(ethers.BigNumber.from(500));

    mockPTN = await MockERC20.deploy(parseEther('1000000'));

    mockPT = await MockERC20.deploy(parseEther('4000'));

    // Fake $Cake Token
    fakePtn = await MockERC20.deploy(parseEther('100'));

    stakingFactory = await StakingPoolFactory.deploy();
  });

  describe('Staking #1 - NO POOL LIMIT', async () => {
    it('Deploy pool with StakingFactory', async () => {
      const address = await (await stakingFactory.deployPool(
        mockPTN.address,
        mockPT.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).wait();
      staking = await ethers.getContractAt('StakingInitializable', address.logs[1].address);
    });

    it('Initial parameters are correct', async () => {
      expect(await staking.PRECISION_FACTOR()).to.be.equal('1000000000000');
      const pool = await staking.pool();
      expect(pool.lastRewardBlock).to.be.equal(startBlock);
      assert.equal(String(pool.rewardPerBlock), rewardPerBlock.toString());
      assert.equal(String(pool.poolLimitPerUser), poolLimitPerUser.toString());
      assert.equal(String(pool.startBlock), startBlock.toString());
      assert.equal(String(pool.rewardEndBlock), endBlock.toString());
      assert.equal(await staking.hasUserLimit(), false);
      assert.equal(await staking.owner(), alice.address);

      // Transfer 4000 PT token to the contract (400 blocks with 10 PT/block)
      await mockPT.transfer(staking.address, parseEther('4000'));
    });
    it('Users deposit', async () => {
      for (const thisUser of [bob, carol, david, erin]) {
        await mockPTN.transfer(thisUser.address, parseEther('1000'));
        await mockPTN.connect(thisUser).approve(staking.address, parseEther('1000'));
        await staking.connect(thisUser).deposit(parseEther('100'));
        // expectEvent(result, 'Deposit', { user: thisUser, amount: String(parseEther('100')) });
        assert.equal(String(await staking.pendingReward(thisUser.address)), '0');
      }
    });

    it('Advance to startBlock', async () => {
      await advanceBlockTo(startBlock.toNumber());
      assert.equal(String(await staking.pendingReward(bob.address)), '0');
    });

    it('Advance to startBlock + 1', async () => {
      await advanceBlockTo((startBlock.add(ethers.BigNumber.from(1))).toNumber());
      assert.equal(String(await staking.pendingReward(bob.address)), String(parseEther('2.5')));
    });

    it('Advance to startBlock + 10', async () => {
      await advanceBlockTo((startBlock.add(ethers.BigNumber.from(10))).toNumber());
      assert.equal(String(await staking.pendingReward(carol.address)), String(parseEther('25')));
    });

    it('Carol can withdraw', async () => {
      await expect(staking.connect(carol).withdraw(parseEther('50')))
        .to.emit(staking, 'Withdraw')
        .withArgs(carol.address, parseEther('50'));
      // She harvests 11 blocks --> 10/4 * 11 = 27.5 PT tokens
      assert.equal(String(await mockPT.balanceOf(carol.address)), String(parseEther('27.5')));
      assert.equal(String(await staking.pendingReward(carol.address)), String(parseEther('0')));
    });

    it('Can collect rewards by calling deposit with amount = 0', async () => {
      await expect(staking.connect(carol).deposit(parseEther('0')))
        .to.emit(staking, 'Deposit')
        .withArgs(carol.address, 0);
      assert.equal(String(await mockPT.balanceOf(carol.address)), String(parseEther('28.92857142855')));
    });

    it('Can collect rewards by calling withdraw with amount = 0', async () => {
      await expect(staking.connect(carol).withdraw(parseEther('0')))
        .to.emit(staking, 'Withdraw')
        .withArgs(carol.address, 0);
      assert.equal(String(await mockPT.balanceOf(carol.address)), String(parseEther('30.3571428571')));
    });

    it('Carol cannot withdraw more than she had', async () => {
      await expect(staking.withdraw(parseEther('70')))
        .to.be.revertedWith('Amount to withdraw too high');
    });

    it('Admin cannot set a limit', async () => {
      await expect(staking.updatePoolLimitPerUser(true, parseEther('1')))
        .to.be.revertedWith('Must be set');
    });

    it('Cannot change after start reward per block, nor start block or end block', async () => {
      await expect(staking.updateRewardPerBlock(parseEther('1')))
        .to.be.revertedWith('Pool has started');
      await expect(staking.updateStartAndEndBlocks('1', '10'))
        .to.be.revertedWith('Pool has started');
    });

    it('Advance to end of IFO', async () => {
      await advanceBlockTo(endBlock.toNumber() + 1);
      for (const thisUser of [bob, david, erin]) {
        await staking.connect(thisUser).withdraw(parseEther('100'));
        expect(await staking.pendingReward(thisUser.address)).to.be.equal(0);
      }
      await staking.connect(carol).withdraw(parseEther('50'));

      // 0.000000001 PT token
      assert.isAtMost(Number(await mockPT.balanceOf(staking.address)), 1000000000);
    });

    it('Cannot deploy a pool with StakingFactory if not owner', async () => {
      await expect(
        stakingFactory.connect(bob).deployPool(
          mockPTN.address,
          mockPT.address,
          rewardPerBlock,
          startBlock,
          endBlock,
          poolLimitPerUser,
          0,
          bob.address,
        ),
      ).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('Cannot deploy a pool with wrong tokens', async () => {
      await expect(
        stakingFactory.deployPool(
          mockPTN.address,
          mockPTN.address,
          rewardPerBlock,
          startBlock,
          endBlock,
          poolLimitPerUser,
          0,
          alice.address,
        ),
      ).to.be.revertedWith(
        'Tokens must be be different',
      );

      await expect(
        stakingFactory.deployPool(
          alice.address,
          mockPTN.address,
          rewardPerBlock,
          startBlock,
          endBlock,
          poolLimitPerUser,
          0,
          alice.address,
        ),
      ).to.be.revertedWith(
        'Transaction reverted: function returned an unexpected amount of data',
      );
    });
  });

  describe('Owner can use recoverToken', async () => {
    const amount = parseEther('100').toString();

    it('Owner can recover token', async () => {
      await fakePtn.transfer(staking.address, amount);

      await expect(staking.recoverToken(fakePtn.address))
        .to.emit(staking, 'TokenRecovery')
        .withArgs(
          fakePtn.address,
          amount,
        )
        .to.emit(fakePtn, 'Transfer')
        .withArgs(
          staking.address,
          alice.address,
          amount,
        );
    });

    it('Owner cannot recover token if balance is zero', async () => {
      await expect(
        staking.recoverToken(fakePtn.address),
      ).to.be.revertedWith(
        'Operations: Cannot recover zero balance',
      );
    });

    it('Owner cannot recover staked token', async () => {
      await expect(
        staking.recoverToken(mockPTN.address),
      ).to.be.revertedWith(
        'Operations: Cannot recover staked token',
      );
    });

    it('Owner cannot recover reward token', async () => {
      await expect(
        staking.recoverToken(mockPT.address),
      ).to.be.revertedWith(
        'Operations: Cannot recover reward token',
      );
    });
  });
});
