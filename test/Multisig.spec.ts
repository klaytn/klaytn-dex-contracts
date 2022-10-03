import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { MultiSigWallet__factory } from '../typechain/factories/contracts/multisig/Multisig.sol/MultiSigWallet__factory';
import { MultiSigWallet } from '../typechain/contracts/multisig/Multisig.sol/MultiSigWallet';

describe('Multisig', () => {
  let owner: SignerWithAddress;
  let owner2: SignerWithAddress;
  let owner3: SignerWithAddress;
  let owner4: SignerWithAddress;
  let owner5: SignerWithAddress;
  let owner6: SignerWithAddress;
  let blockTimestamp: BigNumber;
  let wallet: MultiSigWallet;
  let Wallet: MultiSigWallet__factory;

  before(async () => {
    [owner, owner2, owner3, owner4, owner5, owner6] = await ethers.getSigners();
    Wallet = await ethers.getContractFactory('MultiSigWallet');
  });

  describe('Should remove owner', () => {
    before(async () => {
      wallet = await Wallet.deploy([owner.address, owner2.address,
        owner4.address, owner5.address], 3);
      await wallet.deployed();
    });
    it('should submit transaction, proposal 0', async () => {
      // Proposal 0 - removing owner5
      const transaction = wallet.interface.encodeFunctionData('removeOwner', [owner5.address]);
      expect(await wallet.submitTransaction(wallet.address, 0, transaction))
        .to.emit(wallet, 'Submission')
        .withArgs(0)
        .to.emit(wallet, 'Confirmation')
        .withArgs(0);
      const submitionBlock = await ethers.provider.getBlockNumber();
      blockTimestamp = BigNumber.from((await ethers.provider.getBlock(submitionBlock)).timestamp);
      expect(await wallet.getTransactionInfo(0))
        .to.be.deep.equal([wallet.address, BigNumber.from(0),
          transaction, blockTimestamp, false, BigNumber.from(1)]);
      expect(await wallet.getTransactionCount(true, false))
        .to.be.equal(1);
    });
    it('should revoke confirmation', async () => {
      // owner4 votes on and revokes their confirmation
      await wallet.connect(owner4).confirmAndExecuteTransaction(0);
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner4.address]);
      await wallet.connect(owner4).revokeConfirmation(0);
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address]);
    });
    it('should not revoke if owner has not confirmed', async () => {
      // owner5 tries to remove their confirmation
      await expect(wallet.connect(owner5).revokeConfirmation(0)).to.be.revertedWith('Not confirmed');
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address]);
    });
    it('should confirm transaction', async () => {
      // owner2 confirmes proposal 0
      const transaction = wallet.interface.encodeFunctionData('removeOwner', [owner5.address]);
      expect(await wallet.connect(owner2).confirmAndExecuteTransaction(0))
        .to.emit(wallet, 'Confirmation')
        .withArgs(0);
      expect(await wallet.getTransactionInfo(0))
        .to.be.deep.equal([wallet.address, BigNumber.from(0),
          transaction, blockTimestamp, false, BigNumber.from(2)]);
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner2.address]);
    });
    it('should reject if owner confirmed', async () => {
      // owner2 tries to confirm proposal 0 again
      await expect(wallet.connect(owner2).confirmAndExecuteTransaction(0)).to.be.revertedWith('Already confirmed');
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner2.address]);
    });
    it('should reject if not an owner', async () => {
      await expect(wallet.connect(owner3).confirmAndExecuteTransaction(0)).to.be.reverted;
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner2.address]);
    });
    it('should reject if owner was added after proposal 0 submission, adding proposal-1', async () => {
      // Proposal 1 - adding owner3
      const transaction = wallet.interface.encodeFunctionData('addOwner', [owner3.address]);
      expect(await wallet.submitTransaction(wallet.address, 0, transaction))
        .to.emit(wallet, 'Submission')
        .withArgs(1)
        .to.emit(wallet, 'Confirmation')
        .withArgs(1);
      await wallet.connect(owner2).confirmAndExecuteTransaction(1);
      await wallet.connect(owner4).confirmAndExecuteTransaction(1);
      expect(await wallet.getConfirmations(1)).to.be.deep
        .equal([owner.address, owner2.address, owner4.address]);
      await expect(wallet.connect(owner3).confirmAndExecuteTransaction(0))
        .to.be.revertedWith('The owner is registered after the transaction is submitted');
    });
    it('should reject if owner was replaced after proposal submission', async () => {
      // Proposal -2, replacing owner2 with owner6
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner2.address, owner6.address]);
      expect(await wallet.submitTransaction(wallet.address, 0, transaction))
        .to.emit(wallet, 'Submission')
        .withArgs(2)
        .to.emit(wallet, 'Confirmation')
        .withArgs(2);
      // Priveously added owner3 can vote on the new proposal
      await wallet.connect(owner3).confirmAndExecuteTransaction(2);
      await wallet.connect(owner4).confirmAndExecuteTransaction(2);
      expect(await wallet.getConfirmations(2)).to.be.deep
        .equal([owner.address, owner3.address, owner4.address]);
      await expect(wallet.connect(owner6).confirmAndExecuteTransaction(0))
        .to.be.revertedWith('The owner is registered after the transaction is submitted');
      await expect(wallet.connect(owner6).confirmAndExecuteTransaction(1))
        .to.be.revertedWith('The owner is registered after the transaction is submitted');
    });
    it('should reject execution if owner has not confirmed', async () => {
      // owner5 tries to execute proposal 0
      await expect(wallet.connect(owner5).executeTransaction(0)).to.be.revertedWith('Not confirmed');
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner2.address]);
    });
    it('should execute transaction', async () => {
      const transaction = wallet.interface.encodeFunctionData('removeOwner', [owner5.address]);
      expect(await wallet.getTransactionCount(true, false))
        .to.be.equal(1);
      const ownersBefore: string[] = await wallet.getOwners();

      expect(await wallet.connect(owner4).confirmAndExecuteTransaction(0))
        .to.emit(wallet, 'Confirmation')
        .withArgs(0)
        .to.emit(wallet, 'Execution')
        .withArgs(0)
        .to.emit(wallet, 'OwnerRemoval')
        .withArgs(owner5.address);

      const ownersAfter: string[] = await wallet.getOwners();
      expect(await wallet.getTransactionInfo(0))
        .to.be.deep.equal([wallet.address, BigNumber.from(0),
          transaction, blockTimestamp, true, BigNumber.from(3)]);
      expect(await wallet.getConfirmations(0))
        .to.be.deep.equal([owner.address, owner2.address, owner4.address]);
      expect(await wallet.getTransactionCount(false, true))
        .to.be.equal(3);
      expect(ownersAfter)
        .to.be.deep.equal(ownersBefore.filter((a) => a !== owner5.address));
    });
    it('replaceOwner:fail, both owners exist', async () => {
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner.address, owner6.address]);
      await wallet.submitTransaction(wallet.address, 0, transaction);
      const ownersBefore: string[] = await wallet.getOwners();
      await wallet.connect(owner4).confirmAndExecuteTransaction(3);
      await wallet.connect(owner6).confirmAndExecuteTransaction(3);
      const ownersAfter: string[] = await wallet.getOwners();
      expect(ownersAfter).to.be.deep.equal(ownersBefore);
    });
    it('send 0 ETH to the contract', async () => {
      const transaction = ({
        from: owner.address,
        to: wallet.address,
        value: ethers.utils.parseEther('0'),
      });
      await expect(owner.sendTransaction(transaction)).to.not.emit(wallet, 'Deposit');
      expect(await ethers.provider.getBalance(wallet.address)).to.be.equal(ethers.utils.parseEther('0'));
    });
    it('send ETH to the contract', async () => {
      const transaction = ({
        from: owner.address,
        to: wallet.address,
        value: ethers.utils.parseEther('1'),
      });
      await expect(owner.sendTransaction(transaction)).to.emit(wallet, 'Deposit')
        .withArgs(owner.address, ethers.utils.parseEther('1'));
      expect(await ethers.provider.getBalance(wallet.address)).to.be.equal(ethers.utils.parseEther('1'));
    });
  });

  describe('Should remove owner with changing requirments', () => {
    before(async () => {
      wallet = await Wallet.deploy([owner.address, owner2.address,
        owner3.address], 3);
      await wallet.deployed();
    });
    it('deploy:fail', async () => {
      await expect(Wallet.deploy([owner.address, owner2.address,
        owner3.address], 4)).to.be.reverted;
      await expect(Wallet.deploy([owner.address, owner2.address,
        constants.AddressZero], 4)).to.be.reverted;
      await expect(Wallet.deploy([owner.address, owner2.address,
        owner.address], 3)).to.be.reverted;
    });
    it('removeOwner:fail, owner5 does not exist', async () => {
      // owner2 confirmes proposal 0
      const transaction = wallet.interface.encodeFunctionData('removeOwner', [owner5.address]);
      expect(await wallet.submitTransaction(wallet.address, 0, transaction))
        .to.emit(wallet, 'Submission')
        .withArgs(0)
        .to.emit(wallet, 'Confirmation')
        .withArgs(0);
      expect(await wallet.connect(owner2).confirmAndExecuteTransaction(0))
        .to.emit(wallet, 'Confirmation')
        .withArgs(0);
      expect(await wallet.connect(owner3).confirmAndExecuteTransaction(0))
        .to.be.reverted;
      expect(await wallet.getConfirmations(0))
        .to.be.deep.equal([owner.address, owner2.address, owner3.address]);
      expect(await wallet.getTransactionIds(0, 1, true, false))
        .to.be.deep.equal([0]);
      expect(await wallet.connect(owner3).executeTransaction(0))
        .to.emit(wallet, 'ExecutionFailure')
        .withArgs(0);
    });
    it('removeOwner:req changed', async () => {
      // owner2 confirmes proposal 0
      const transaction = wallet.interface.encodeFunctionData('removeOwner', [owner3.address]);
      expect(await wallet.submitTransaction(wallet.address, 0, transaction))
        .to.emit(wallet, 'Submission')
        .withArgs(1)
        .to.emit(wallet, 'Confirmation')
        .withArgs(1);
      expect(await wallet.connect(owner2).confirmAndExecuteTransaction(1))
        .to.emit(wallet, 'Confirmation')
        .withArgs(1);
      expect(await wallet.connect(owner3).confirmAndExecuteTransaction(1))
        .to.emit(wallet, 'Confirmation')
        .withArgs(1)
        .to.emit(wallet, 'RequirementChange')
        .withArgs(2);
      expect(await wallet.getConfirmations(1))
        .to.be.deep.equal([owner.address, owner2.address, owner3.address]);
      expect(await wallet.getTransactionIds(0, 1, false, true))
        .to.be.deep.equal([1]);
      expect(await wallet.required()).to.be.equal(2);
    });
    it('removeOwner:req changed', async () => {
      const transaction = wallet.interface.encodeFunctionData('removeOwner', [owner2.address]);
      await wallet.submitTransaction(wallet.address, 0, transaction);
      // transaction does not exist
      await expect(wallet.connect(owner2).confirmAndExecuteTransaction(3)).to.be.reverted;
      // confirm correct transaction
      await wallet.connect(owner2).confirmAndExecuteTransaction(2);
      expect(await wallet.getConfirmations(2))
        .to.be.deep.equal([owner.address, owner2.address]);
      expect(await wallet.getTransactionIds(0, 2, false, true))
        .to.be.deep.equal([1, 2]);
      expect(await wallet.required()).to.be.equal(1);
    });
    it('replaceOwner:fail, same owners', async () => {
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner.address, owner.address]);
      await wallet.submitTransaction(wallet.address, 0, transaction);
      // eslint-disable-next-line no-underscore-dangle
      expect((await wallet.getTransactionInfo(3)).executed_).to.be.equal(false);
    });
    it('replaceOwner:fail, owner does not exist', async () => {
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner5.address, owner6.address]);
      await wallet.submitTransaction(wallet.address, 0, transaction);
      // eslint-disable-next-line no-underscore-dangle
      expect((await wallet.getTransactionInfo(4)).executed_).to.be.equal(false);
    });
    it('replaceOwner:fail, new owner is zero address', async () => {
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner.address, constants.AddressZero]);
      await wallet.submitTransaction(wallet.address, 0, transaction);
      // eslint-disable-next-line no-underscore-dangle
      expect((await wallet.getTransactionInfo(5)).executed_).to.be.equal(false);
      expect(await wallet.getTransactionIds(0, 5, true, false))
        .to.be.deep.equal([0, 3, 4, 5, 0]);
    });
    it('replaceOwner:fail, destination is zero address', async () => {
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner.address, owner2.address]);
      await expect(wallet.submitTransaction(constants.AddressZero, 0, transaction))
        .to.be.reverted;
    });
    it('addOwner:fail, same owner', async () => {
      const transaction = wallet.interface.encodeFunctionData('addOwner', [owner.address]);
      await wallet.submitTransaction(wallet.address, 0, transaction);
      // eslint-disable-next-line no-underscore-dangle
      expect((await wallet.getTransactionInfo(6)).executed_).to.be.equal(false);
    });
    it('revokeConfirmation:fail, tx is already executed', async () => {
      await expect(wallet.revokeConfirmation(2)).to.be.reverted;
    });
    it('addOwner:fail, caller is not an owner', async () => {
      await expect(wallet.connect(owner5).addOwner(owner2.address)).to.be.reverted;
    });
  });
});
