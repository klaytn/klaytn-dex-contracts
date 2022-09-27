import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
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
      await wallet.connect(owner4).confirmTransaction(0);
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
      expect(await wallet.connect(owner2).confirmTransaction(0))
        .to.emit(wallet, 'Confirmation')
        .withArgs(0);
      expect(await wallet.getTransactionInfo(0))
        .to.be.deep.equal([wallet.address, BigNumber.from(0),
          transaction, blockTimestamp, false, BigNumber.from(2)]);
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner2.address]);
    });
    it('should reject if owner confirmed', async () => {
      // owner2 tries to confirm proposal 0 again
      await expect(wallet.connect(owner2).confirmTransaction(0)).to.be.revertedWith('Already confirmed');
      expect(await wallet.getConfirmations(0)).to.be.deep.equal([owner.address, owner2.address]);
    });
    it('should reject if not an owner', async () => {
      await expect(wallet.connect(owner3).confirmTransaction(0)).to.be.reverted;
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
      await wallet.connect(owner2).confirmTransaction(1);
      await wallet.connect(owner4).confirmTransaction(1);
      expect(await wallet.getConfirmations(1)).to.be.deep
        .equal([owner.address, owner2.address, owner4.address]);
      await expect(wallet.connect(owner3).confirmTransaction(0))
        .to.be.revertedWith('The owner is registered after the transaction is submitted');
    });
    it('should reject if owner was replaced after proposal submission', async () => {
      // Replacing owner2 with owner6, proposlal - 2
      const transaction = wallet.interface.encodeFunctionData('replaceOwner', [owner2.address, owner6.address]);
      expect(await wallet.submitTransaction(wallet.address, 0, transaction))
        .to.emit(wallet, 'Submission')
        .withArgs(2)
        .to.emit(wallet, 'Confirmation')
        .withArgs(2);
      // Priveously added owner3 can vote on the new proposal
      await wallet.connect(owner3).confirmTransaction(2);
      await wallet.connect(owner4).confirmTransaction(2);
      expect(await wallet.getConfirmations(2)).to.be.deep
        .equal([owner.address, owner3.address, owner4.address]);
      await expect(wallet.connect(owner6).confirmTransaction(0))
        .to.be.revertedWith('The owner is registered after the transaction is submitted');
      await expect(wallet.connect(owner6).confirmTransaction(1))
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

      expect(await wallet.connect(owner4).confirmTransaction(0))
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
  });
});
