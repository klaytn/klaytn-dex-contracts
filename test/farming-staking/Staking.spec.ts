/* eslint-disable no-await-in-loop */
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { BigNumber, constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect, assert } from 'chai';
import { mineUpTo } from '@nomicfoundation/hardhat-network-helpers';
import { StakingFactory__factory } from '../../typechain/factories/contracts/farming/StakingFactory__factory';
import { KIP7Mock__factory } from '../../typechain/factories/contracts/mocks/KIP7TestMock.sol/KIP7Mock__factory';
import { StakingFactory } from '../../typechain/contracts/farming/StakingFactory';
import { StakingInitializable } from '../../typechain/contracts/farming/StakingFactoryPool.sol/StakingInitializable';
import { KIP7Mock } from '../../typechain/contracts/mocks/KIP7TestMock.sol/KIP7Mock';

describe('Staking', () => {
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

  let poolLimitPerUser = parseEther('0');
  const rewardPerBlock = parseEther('10');

  // Contracts
  let fakePtn: KIP7Mock;
  let mockPTN: KIP7Mock;
  let mockPT: KIP7Mock;
  let mockPT2: KIP7Mock;
  let emptyToken: KIP7Mock;
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
    mockPT2 = await MockERC20.deploy(parseEther('4000'));
    emptyToken = await MockERC20.deploy(0);

    // Fake PTN Token
    fakePtn = await MockERC20.deploy(parseEther('100'));
    await expect(StakingPoolFactory.deploy(constants.AddressZero)).to.be.revertedWith('Multisig cannot be the zero address');
    stakingFactory = await StakingPoolFactory.deploy(alice.address);
  });

  describe('Staking #1 - no limit pool', async () => {
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

    it('Deploy pool:fail, multisig cannot be the zero address', async () => {
      await expect(stakingFactory.deployPool(
        mockPTN.address,
        mockPT.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        constants.AddressZero,
      )).to.be.reverted;
    });

    it('Deploy pool:fail, staking token - no supply', async () => {
      await expect(stakingFactory.deployPool(
        mockPTN.address,
        emptyToken.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).to.be.reverted;
    });

    it('Deploy pool:fail, reward token - no supply', async () => {
      await expect(stakingFactory.deployPool(
        emptyToken.address,
        mockPT.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).to.be.reverted;
    });

    it('Deploy pool:fail, tokens must be defferent', async () => {
      await expect(stakingFactory.deployPool(
        mockPTN.address,
        mockPTN.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).to.be.revertedWith('Tokens must be different');
    });

    it('Deploy pool:fail, invalid start block', async () => {
      await expect(stakingFactory.deployPool(
        mockPTN.address,
        mockPT.address,
        rewardPerBlock,
        endBlock,
        startBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).to.be.revertedWith('Invalid start block');
    });

    it('Deploy pool:fail, wrong parameters', async () => {
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
      ).to.be.rejectedWith('Transaction reverted: function returned an unexpected amount of data');
    });

    it('Deploy pool:fail, not an owner', async () => {
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

    it('initialize:fail, already initilized', async () => {
      await expect(staking.initialize(
        mockPTN.address,
        mockPTN.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).to.be.revertedWith('Already initialized');
    });

    it('initialize:fail, not factory', async () => {
      const poolContract = await ethers.getContractFactory('StakingInitializable');
      const pool = await poolContract.deploy();
      await expect(pool.connect(carol).initialize(
        mockPTN.address,
        mockPT.address,
        rewardPerBlock,
        startBlock,
        endBlock,
        poolLimitPerUser,
        0,
        alice.address,
      )).to.be.revertedWith('Not factory');
    });

    it('change startBlock end endBlock:fail, start block < endBlock', async () => {
      await expect(staking.updateStartAndEndBlocks(endBlock, startBlock))
        .to.be.revertedWith('New startBlock must be lower than new endBlock');
    });

    it('change startBlock end endBlock:fail, start block < block.timestamp', async () => {
      const wrongStarBlock = (await ethers.provider.getBlockNumber()) - 1;
      await expect(staking.updateStartAndEndBlocks(wrongStarBlock, endBlock))
        .to.be.revertedWith('New startBlock must be higher than current block');
    });

    it('change startBlock end endBlock', async () => {
      startBlock = ethers.BigNumber.from(blockNumber).add(ethers.BigNumber.from(100));
      endBlock = ethers.BigNumber.from(blockNumber).add(ethers.BigNumber.from(500));
      await staking.updateStartAndEndBlocks(startBlock, endBlock);
    });

    it('Initial parameters are correct', async () => {
      expect(await staking.PRECISION_FACTOR()).to.be.equal('10000000000000000000');
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
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        await mockPTN.transfer(thisUser.address, parseEther('1000'));
        await mockPTN.connect(thisUser).approve(staking.address, parseEther('1000'));
        await staking.connect(thisUser).deposit(parseEther('100'));
        assert.equal(String(await staking.pendingReward(thisUser.address)), '0');
      }
    });

    it('Advance to startBlock', async () => {
      await mineUpTo(startBlock.toNumber());
      assert.equal(String(await staking.pendingReward(bob.address)), '0');
    });

    it('change startBlock end endBlock:fail, pool has started', async () => {
      await expect(staking.updateStartAndEndBlocks(startBlock.add(100), endBlock.add(100)))
        .to.be.revertedWith('Pool has started');
    });

    it('Advance to startBlock + 2', async () => {
      await mineUpTo((startBlock.add(ethers.BigNumber.from(2))).toNumber());
      assert.equal(String(await staking.pendingReward(bob.address)), String(parseEther('5')));
    });

    it('Advance to startBlock + 10', async () => {
      await mineUpTo((startBlock.add(ethers.BigNumber.from(10))).toNumber());
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
      assert.equal(String(await mockPT.balanceOf(carol.address)), String(parseEther('28.928571428571428570')));
    });

    it('Can collect rewards by calling withdraw with amount = 0', async () => {
      await expect(staking.connect(carol).withdraw(parseEther('0')))
        .to.emit(staking, 'Withdraw')
        .withArgs(carol.address, 0);
      assert.equal(String(await mockPT.balanceOf(carol.address)), String(parseEther('30.357142857142857140')));
    });

    it('Carol cannot withdraw more than she had', async () => {
      await expect(staking.withdraw(parseEther('70')))
        .to.be.revertedWith('Amount to withdraw too high');
    });

    it('updatePoolLimitPerUser:failed, limit must be set for this pool', async () => {
      await expect(staking.updatePoolLimitPerUser(true, parseEther('1')))
        .to.be.revertedWith('Must be set');
    });

    it('updateRewardPerBlock:failed, pool has started', async () => {
      await expect(staking.updateRewardPerBlock(parseEther('1')))
        .to.be.revertedWith('Pool has started');
    });

    it('Advance to end of IFO', async () => {
      await mineUpTo(endBlock.toNumber() + 1);
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, david, erin]) {
        await staking.connect(thisUser).withdraw(parseEther('100'));
        expect(await staking.pendingReward(thisUser.address)).to.be.equal(0);
      }
      await staking.connect(carol).withdraw(parseEther('50'));

      // 0.000000001 PT token
      assert.isAtMost(Number(await mockPT.balanceOf(staking.address)), 1000000000);
    });

    it('Deposit/withdraw after pool ended', async () => {
      const PTNbalance = await mockPT.balanceOf(staking.address);
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, david, erin]) {
        await staking.connect(thisUser).deposit(parseEther('10'));
        expect(await staking.pendingReward(thisUser.address)).to.be.equal(0);
      }
      await mineUpTo(endBlock.toNumber() + 10);
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, david, erin]) {
        expect(await staking.pendingReward(thisUser.address)).to.be.equal(0);
        await staking.connect(thisUser).deposit(parseEther('10'));
        await staking.connect(thisUser).withdraw(parseEther('20'));
      }
      expect(await mockPT.balanceOf(staking.address)).to.be.equal(PTNbalance);
    });
  });

  describe('Staking #1 - owner can use recoverToken', async () => {
    const amount = parseEther('100').toString();

    it('Owner can recover token', async () => {
      await fakePtn.transfer(staking.address, amount);

      await expect(staking.recoverToken(fakePtn.address, alice.address))
        .to.emit(staking, 'TokenRecovery')
        .withArgs(
          fakePtn.address,
          alice.address,
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
        staking.recoverToken(fakePtn.address, alice.address),
      ).to.be.revertedWith(
        'Operations: Cannot recover zero balance',
      );
    });

    it('Owner cannot recover staked token', async () => {
      await expect(
        staking.recoverToken(mockPTN.address, alice.address),
      ).to.be.revertedWith(
        'Operations: Cannot recover staked token',
      );
    });

    it('Owner cannot recover reward token', async () => {
      await expect(
        staking.recoverToken(mockPT.address, alice.address),
      ).to.be.revertedWith(
        'Operations: Cannot recover reward token',
      );
    });

    it('Owner cannot recover to the zero address', async () => {
      await expect(
        staking.recoverToken(mockPT.address, constants.AddressZero),
      ).to.be.revertedWith(
        'Recover to the zero address',
      );
    });
  });

  describe('Staking #2 - user limit pool', async () => {
    it('Deploy user limit pool with StakingFactory', async () => {
      poolLimitPerUser = parseEther('100');
      blockNumber = await ethers.provider.getBlockNumber();
      startBlock = ethers.BigNumber.from(blockNumber).add(ethers.BigNumber.from(100));
      endBlock = ethers.BigNumber.from(blockNumber).add(ethers.BigNumber.from(500));
      const address = await (await stakingFactory.deployPool(
        mockPTN.address,
        mockPT2.address,
        rewardPerBlock.add(parseEther('15')),
        startBlock,
        endBlock,
        poolLimitPerUser,
        endBlock.sub(startBlock),
        alice.address,
      )).wait();
      staking = await ethers.getContractAt('StakingInitializable', address.logs[1].address);
    });

    it('Initial parameters for limited pool are correct', async () => {
      expect(await staking.PRECISION_FACTOR()).to.be.equal('10000000000000000000');
      const pool = await staking.pool();
      expect(pool.lastRewardBlock).to.be.equal(startBlock);
      assert.equal(String(pool.rewardPerBlock), (rewardPerBlock.add(parseEther('15'))).toString());
      assert.equal(String(pool.poolLimitPerUser), poolLimitPerUser.toString());
      assert.equal(String(pool.startBlock), startBlock.toString());
      assert.equal(String(pool.rewardEndBlock), endBlock.toString());
      assert.equal(await staking.hasUserLimit(), true);
      assert.equal(await staking.owner(), alice.address);

      // Transfer 4000 PT token to the contract (400 blocks with 10 PT/block)
      await mockPT2.transfer(staking.address, parseEther('4000'));
    });

    it('Staking #2, updateRewardPerBlock, correct pool reward before pool has been started', async () => {
      await expect(staking.updateRewardPerBlock(parseEther('10')))
        .to.emit(staking, 'NewRewardPerBlock')
        .withArgs(rewardPerBlock);
    });

    it('Staking #2, Users deposit:fail, amount is higher than userLimit', async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        await mockPTN.transfer(thisUser.address, parseEther('1000'));
        await mockPTN.connect(thisUser).approve(staking.address, parseEther('1000'));
        await expect(staking.connect(thisUser).deposit(parseEther('150')))
          .to.be.revertedWith('Deposit: Amount above limit');
        assert.equal(String(await staking.pendingReward(thisUser.address)), '0');
      }
    });

    it('Staking #2, Users deposit', async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        await staking.connect(thisUser).deposit(parseEther('100'));
        assert.equal(String(await staking.pendingReward(thisUser.address)), '0');
      }
    });

    it('Staking #2, Advance to startBlock', async () => {
      await mineUpTo(startBlock.toNumber());
      assert.equal(String(await staking.pendingReward(bob.address)), '0');
    });

    it('Staking #2, Advance to startBlock + 2', async () => {
      await mineUpTo((startBlock.add(ethers.BigNumber.from(2))).toNumber());
      assert.equal(String(await staking.pendingReward(bob.address)), String(parseEther('5')));
    });

    it('Staking #2, Advance to startBlock + 10', async () => {
      await mineUpTo((startBlock.add(ethers.BigNumber.from(10))).toNumber());
      assert.equal(String(await staking.pendingReward(carol.address)), String(parseEther('25')));
    });

    it('Staking #2, Carol can withdraw', async () => {
      await expect(staking.connect(carol).withdraw(parseEther('50')))
        .to.emit(staking, 'Withdraw')
        .withArgs(carol.address, parseEther('50'));
      // She harvests 11 blocks --> 10/4 * 11 = 27.5 PT tokens
      assert.equal(String(await mockPT2.balanceOf(carol.address)), String(parseEther('27.5')));
      assert.equal(String(await staking.pendingReward(carol.address)), String(parseEther('0')));
    });

    it('Staking #2, Can collect rewards by calling deposit with amount = 0', async () => {
      await expect(staking.connect(carol).deposit(parseEther('0')))
        .to.emit(staking, 'Deposit')
        .withArgs(carol.address, 0);
      assert.equal(String(await mockPT2.balanceOf(carol.address)), String(parseEther('28.928571428571428570')));
    });

    it('Staking #2, Can collect rewards by calling withdraw with amount = 0', async () => {
      await expect(staking.connect(carol).withdraw(parseEther('0')))
        .to.emit(staking, 'Withdraw')
        .withArgs(carol.address, 0);
      assert.equal(String(await mockPT2.balanceOf(carol.address)), String(parseEther('30.357142857142857140')));
    });

    it('Staking #2, Carol cannot withdraw more than she had', async () => {
      await expect(staking.withdraw(parseEther('70')))
        .to.be.revertedWith('Amount to withdraw too high');
    });

    it('Staking #2, updatePoolLimitPerUser:failed, new limit must be higher', async () => {
      await expect(staking.updatePoolLimitPerUser(true, parseEther('1')))
        .to.be.revertedWith('New limit must be higher');
    });

    it('Staking #2, updatePoolLimitPerUser, deposit:fail - above limit', async () => {
      // increase pool user limit to 150
      await expect(staking.updatePoolLimitPerUser(true, parseEther('150')))
        .to.emit(staking, 'NewPoolLimit')
        .withArgs(parseEther('150'));
      const pool = await staking.pool();
      assert.equal(String(pool.poolLimitPerUser), parseEther('150').toString());
      // trying to stake 150 PTN more
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        await expect(staking.connect(thisUser).deposit(parseEther('150')))
          .to.be.revertedWith('Deposit: Amount above limit');
      }
    });

    it('Staking #2, deposit 50 PTN more', async () => {
      // trying to stake 50 PTN more
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        await staking.connect(thisUser).deposit(parseEther('50'));
      }
    });

    it('Staking #2, disable pool limit for users', async () => {
      await expect(staking.updatePoolLimitPerUser(false, parseEther('150')))
        .to.emit(staking, 'NewPoolLimit')
        .withArgs(parseEther('0'));
      const pool = await staking.pool();
      assert.equal(String(pool.poolLimitPerUser), parseEther('0').toString());
      assert.equal(await staking.hasUserLimit(), false);
    });

    it('Staking #2, deposit more PTN ', async () => {
      // trying to stake random amount of PTN more
      await staking.connect(erin).deposit(parseEther('150'));
      await staking.connect(david).deposit(parseEther('450'));
      // bob stakes his whole balance
      const bobBalance = await mockPTN.balanceOf(bob.address);
      await mockPTN.connect(bob).approve(staking.address, bobBalance);
      await staking.connect(bob).deposit(
        bobBalance,
      );
    });

    it('Staking #2, updateRewardPerBlock:fail, not an owner', async () => {
      await expect(staking.connect(erin).updateRewardPerBlock(parseEther('5')))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Staking #2, updateRewardPerBlock:fail, pool has started', async () => {
      await expect(staking.updateRewardPerBlock(parseEther('5')))
        .to.be.revertedWith('Pool has started');
    });
  });
  describe('Staking #2 - pool emergency case', async () => {
    it('Staking #2, stopReward:fail, not an owner', async () => {
      await expect(staking.connect(carol).stopReward())
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('Staking #2, stopReward', async () => {
      const rewardEndBlock = await ethers.provider.getBlockNumber();
      // rewards are stoped inthe next block, so rewardEndBlock + 1
      await expect(staking.stopReward())
        .to.be.emit(staking, 'RewardsStop')
        .withArgs(rewardEndBlock + 1);
    });

    it('Staking #2, emergencyRewardWithdraw:fail, not an owner', async () => {
      const poolBalance = await mockPT2.balanceOf(staking.address);
      await expect(staking.connect(carol).emergencyRewardWithdraw(poolBalance, alice.address))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Staking #2, emergencyRewardWithdraw:fail, recipien is zero address', async () => {
      const poolBalance = await mockPT2.balanceOf(staking.address);
      await expect(staking.emergencyRewardWithdraw(poolBalance, constants.AddressZero))
        .to.be.revertedWith('Withdraw to the zero address');
    });

    it('Staking #2, emergencyRewardWithdraw', async () => {
      const poolBalance = await mockPT2.balanceOf(staking.address);
      const ownerBalance = await mockPT2.balanceOf(alice.address);
      await staking.emergencyRewardWithdraw(poolBalance, alice.address);
      expect(await mockPT2.balanceOf(alice.address)).to.equal(ownerBalance.add(poolBalance));
      expect(await mockPT2.balanceOf(staking.address)).to.equal(0);
    });

    it('Staking #2, users perform emergency withdrawal', async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        const userBalance = (await staking.userInfo(thisUser.address)).amount;
        await expect(staking.connect(thisUser).emergencyWithdraw())
          .to.be.emit(staking, 'EmergencyWithdraw')
          .withArgs(thisUser.address, userBalance);
      }
    });

    it('Staking #2, users perform second emergency withdrawal', async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const thisUser of [bob, carol, david, erin]) {
        await expect(staking.connect(thisUser).emergencyWithdraw())
          .to.be.emit(staking, 'EmergencyWithdraw')
          .withArgs(thisUser.address, 0);
      }
    });
  });
});
