import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Farming__factory } from '../../typechain/factories/farming/Farming__factory';
import { PlatformToken__factory } from '../../typechain/factories/tokens/PlatformToken__factory';
import { DexKIP7Test__factory } from '../../typechain/factories/mocks/DexKIP7Test__factory';
import { Farming } from '../../typechain/farming/Farming';
import { PlatformToken } from '../../typechain/tokens/PlatformToken';
import { DexKIP7Test } from '../../typechain/mocks/DexKIP7Test';
import { advanceBlockTo } from '../shared/utilities';

describe('Farming2', () => {
  let minter: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let FarmingF: Farming__factory;
  let PTN: PlatformToken__factory;
  let KIP7LP: DexKIP7Test__factory;
  let ptn: PlatformToken;
  let farming: Farming;
  let lp: DexKIP7Test;
  let lp2: DexKIP7Test;
  before(async () => {
    [minter, alice, bob, carol] = await ethers.getSigners();
    FarmingF = await ethers.getContractFactory('Farming');
    PTN = await ethers.getContractFactory('PlatformToken');
    KIP7LP = await ethers.getContractFactory('DexKIP7Test');
  });

  beforeEach(async () => {
    ptn = await PTN.deploy('Platform Token', 'PTN', minter.address);
    await ptn.deployed();
  });

  it('should set correct state variables', async () => {
    farming = await FarmingF.deploy(ptn.address, '1000', '0', minter.address);
    await farming.deployed();
    expect(await ptn.hasRole((await ptn.DEFAULT_ADMIN_ROLE()), minter.address)).to.be.equal(true);
    await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);

    const ptnAddress = await farming.ptn();

    expect(ptnAddress).to.equal(ptn.address);
    expect(await ptn.hasRole((await ptn.MINTER_ROLE()), farming.address)).to.be.equal(true);
  });

  context('With ERC/LP token added to the field', () => {
    beforeEach(async () => {
      lp = await KIP7LP.deploy('10000000000');

      await lp.transfer(alice.address, '1000');

      await lp.transfer(bob.address, '1000');

      await lp.transfer(carol.address, '1000');

      lp2 = await KIP7LP.deploy('10000000000');

      await lp2.transfer(alice.address, '1000');

      await lp2.transfer(bob.address, '1000');

      await lp2.transfer(carol.address, '1000');
    });

    it('should allow emergency withdraw', async () => {
      // 100 per block farming rate starting at block 100 with bonus until block 1000
      farming = await FarmingF.deploy(ptn.address, '100', '100', minter.address);
      await farming.deployed();

      await farming.add('100', lp.address, true, 1, '10000');

      await lp.connect(bob).approve(farming.address, '1000');

      await farming.connect(bob).deposit(0, '100');

      expect(await lp.balanceOf(bob.address)).to.equal('900');

      await farming.connect(bob).emergencyWithdraw(0);

      expect(await lp.balanceOf(bob.address)).to.equal('1000');
    });

    it('should give out PTNs only after farming time [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block 100
      farming = await FarmingF.deploy(ptn.address, '1000', '100', minter.address);
      await farming.deployed();
      await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);

      const lp3 = await KIP7LP.deploy('10000000000');
      const lp4 = await KIP7LP.deploy('10000000000');
      const lp5 = await KIP7LP.deploy('10000000000');
      const lp6 = await KIP7LP.deploy('10000000000');
      const lp7 = await KIP7LP.deploy('10000000000');
      const lp8 = await KIP7LP.deploy('10000000000');
      const lp9 = await KIP7LP.deploy('10000000000');

      await farming.add('2000', lp.address, true, 1, '10000');
      await farming.add('1000', lp2.address, true, 1, '10000');
      await farming.add('500', lp3.address, true, 1, '10000');
      await farming.add('500', lp4.address, true, 1, '10000');
      await farming.add('500', lp5.address, true, 1, '10000');
      await farming.add('500', lp6.address, true, 1, '10000');
      await farming.add('500', lp7.address, true, 1, '10000');
      await farming.add('100', lp8.address, true, 1, '10000');
      await farming.add('100', lp9.address, true, 1, '10000');

      expect(await farming.poolLength()).to.be.equal(9);

      await lp.connect(bob).approve(farming.address, '1000');
      await farming.connect(bob).deposit(0, '20');
      await advanceBlockTo(89);

      await farming.connect(bob).deposit(0, '0'); // block 90
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      await advanceBlockTo(94);

      await farming.connect(bob).deposit(0, '0'); // block 95
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      await advanceBlockTo(99);

      await farming.connect(bob).deposit(0, '0'); // block 100
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      await advanceBlockTo(100);

      await farming.connect(bob).deposit(0, '0'); // block 101
      expect(await ptn.balanceOf(bob.address)).to.equal('350');

      await advanceBlockTo(104);
      await farming.connect(bob).deposit(0, '0'); // block 105

      expect(await ptn.balanceOf(bob.address)).to.equal('1753');
      expect(await ptn.totalSupply()).to.equal('1753');
    });

    it('should not distribute ptns if no one deposit [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block 200
      farming = await FarmingF.deploy(ptn.address, '1000', '200', minter.address);
      const lp3 = await KIP7LP.deploy('10000000000');
      await farming.deployed();
      await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
      await farming.add('1000', lp.address, true, 1, '10000');
      await farming.add('1000', lp2.address, true, 1, '10000');
      await farming.add('1000', lp3.address, true, 1, '10000');
      await lp.connect(bob).approve(farming.address, '1000');
      await advanceBlockTo(199);
      expect(await ptn.totalSupply()).to.equal('0');
      await advanceBlockTo(204);
      expect(await ptn.totalSupply()).to.equal('0');
      await advanceBlockTo(209);
      await farming.connect(bob).deposit(0, '20'); // block 210
      expect(await ptn.totalSupply()).to.equal('0');
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      expect(await lp.balanceOf(bob.address)).to.equal('980');
      await advanceBlockTo(219);
      await farming.connect(bob).withdraw(0, '10'); // block 220
      expect(await ptn.totalSupply()).to.equal('3333');
      expect(await ptn.balanceOf(bob.address)).to.equal('3333');
      expect(await lp.balanceOf(bob.address)).to.equal('990');
    });

    it('should distribute ptns properly for each staker [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block 300
      farming = await FarmingF.deploy(ptn.address, '100', '300', minter.address);
      await farming.deployed();
      await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
      await farming.add('100', lp.address, true, 1, '10000');
      await lp.connect(alice).approve(farming.address, '1000');
      await lp.connect(bob).approve(farming.address, '1000');
      await lp.connect(carol).approve(farming.address, '1000');
      // Alice deposits 10 LPs at block 310
      await advanceBlockTo(309);
      await farming.connect(alice).deposit(0, '10');
      // Bob deposits 20 LPs at block 314
      await advanceBlockTo(313);
      await farming.connect(bob).deposit(0, '20');
      // Carol deposits 30 LPs at block 318
      await advanceBlockTo(317);
      await farming.connect(carol).deposit(0, '30');
      // Alice deposits 10 more LPs at block 320. At this point:
      await advanceBlockTo(319);
      await farming.connect(alice).deposit(0, '10');
      expect(await ptn.totalSupply()).to.equal('1000');
      expect(await ptn.balanceOf(alice.address)).to.equal('566');
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      expect(await ptn.balanceOf(carol.address)).to.equal('0');
      expect(await ptn.balanceOf(farming.address)).to.equal('434');
      // Bob withdraws 5 LPs at block 330. At this point:
      await advanceBlockTo(329);
      await farming.connect(bob).withdraw(0, '5');
      expect(await ptn.totalSupply()).to.equal('2000');
      expect(await ptn.balanceOf(alice.address)).to.equal('566');
      expect(await ptn.balanceOf(bob.address)).to.equal('619');
      expect(await ptn.balanceOf(carol.address)).to.equal('0');
      expect(await ptn.balanceOf(farming.address)).to.equal('815');
      // Alice withdraws 20 LPs at block 340.
      // Bob withdraws 15 LPs at block 350.
      // Carol withdraws 30 LPs at block 360.
      await advanceBlockTo(339);
      await farming.connect(alice).withdraw(0, '20');
      await advanceBlockTo(349);
      await farming.connect(bob).withdraw(0, '15');
      await advanceBlockTo(359);
      await farming.connect(carol).withdraw(0, '30');
      expect(await ptn.totalSupply()).to.equal('5000');
      expect(await ptn.balanceOf(alice.address)).to.equal('1159');
      expect(await ptn.balanceOf(bob.address)).to.equal('1183');
      expect(await ptn.balanceOf(carol.address)).to.equal('2657');
      // All of them should have 1000 LPs back.
      expect(await lp.balanceOf(alice.address)).to.equal('1000');
      expect(await lp.balanceOf(bob.address)).to.equal('1000');
      expect(await lp.balanceOf(carol.address)).to.equal('1000');
    });

    // it('should distribute ptns properly for each staker on coverage', async () => {
    // //   // 100 per block farming rate starting at block 300
    //   farming = await FarmingF.deploy(ptn.address, '100', '300', minter.address);
    //   await farming.deployed();
    //   await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
    //   await farming.add('100', lp.address, true, 1, '10000');
    //   await lp.connect(alice).approve(farming.address, '1000');
    //   await lp.connect(bob).approve(farming.address, '1000');
    //   await lp.connect(carol).approve(farming.address, '1000');
    //   // Alice deposits 10 LPs at block 310
    //   await advanceBlockTo(309);
    //   await farming.connect(alice).deposit(0, '10');
    //   // Bob deposits 20 LPs at block 314
    //   await advanceBlockTo(313);
    //   await farming.connect(bob).deposit(0, '20');
    //   // Carol deposits 30 LPs at block 318
    //   await advanceBlockTo(317);
    //   await farming.connect(carol).deposit(0, '30');
    //   // Alice deposits 10 more LPs at block 320. At this point:
    //   await advanceBlockTo(319);
    //   await farming.connect(alice).deposit(0, '10');
    //   // Bob withdraws 5 LPs at block 330. At this point:
    //   await advanceBlockTo(329);
    //   await farming.connect(bob).withdraw(0, '5');
    //   // Alice withdraws 20 LPs at block 340.
    //   // Bob withdraws 15 LPs at block 350.
    //   // Carol withdraws 30 LPs at block 360.
    //   await advanceBlockTo(339);
    //   await farming.connect(alice).withdraw(0, '20');
    //   await advanceBlockTo(349);
    //   await farming.connect(bob).withdraw(0, '15');
    //   await advanceBlockTo(359);
    //   await farming.connect(carol).withdraw(0, '30');
    //   // All of them should have 1000 LPs back.
    //   expect(await lp.balanceOf(alice.address)).to.equal('1000');
    //   expect(await lp.balanceOf(bob.address)).to.equal('1000');
    //   expect(await lp.balanceOf(carol.address)).to.equal('1000');
    // });

    it('should give proper ptns allocation to each pool [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block 400
      farming = await FarmingF.deploy(ptn.address, '100', '400', minter.address);
      await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
      await lp.connect(alice).approve(farming.address, '1000');
      await lp2.connect(bob).approve(farming.address, '1000');
      // Add first LP to the pool with allocation 1
      await farming.add('10', lp.address, true, 1, '10000');
      // Alice deposits 10 LPs at block 410
      await advanceBlockTo(409);
      await farming.connect(alice).deposit(0, '10');
      // Add LP2 to the pool with allocation 2 at block 420
      await advanceBlockTo(419);
      await farming.add('20', lp2.address, true, 1, '10000');

      // Alice should have 1000 pending reward
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1000');
      // Bob deposits 10 LP2s at block 425
      await advanceBlockTo(424);
      await farming.connect(bob).deposit(1, '5');

      // Alice should have 1166 pending reward
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1166');
      await advanceBlockTo(430);

      // Alice should have 1333 pending reward
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1333');

      // Bob should have 333 pending reward
      expect(await farming.pendingPtn(1, bob.address)).to.equal('333');

      await advanceBlockTo(440);
      await farming.updatePtnPerBlock(0);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
      await advanceBlockTo(450);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
      await advanceBlockTo(460);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
      await advanceBlockTo(550);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
    });
    // it('should give proper ptns allocation to each pool on-coverage', async () => {
    //   // 100 per block farming rate starting at block 400
    //   farming = await FarmingF.deploy(ptn.address, '100', '400', minter.address);
    //   await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
    //   await lp.connect(alice).approve(farming.address, '1000');
    //   await lp2.connect(bob).approve(farming.address, '1000');
    //   // Add first LP to the pool with allocation 1
    //   await farming.add('10', lp.address, true, 1, '10000');
    //   // Alice deposits 10 LPs at block 410
    //   await advanceBlockTo(409);
    //   await farming.connect(alice).deposit(0, '10');
    //   // Add LP2 to the pool with allocation 2 at block 420
    //   await advanceBlockTo(419);
    //   await farming.add('20', lp2.address, true, 1, '10000');

    //   // Bob deposits 10 LP2s at block 425
    //   await advanceBlockTo(424);
    //   await farming.connect(bob).deposit(1, '5');

    //   await advanceBlockTo(430);

    //   await advanceBlockTo(440);
    //   await farming.updatePtnPerBlock(0);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    //   await advanceBlockTo(450);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    //   await advanceBlockTo(460);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    //   await advanceBlockTo(550);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    // });

    it('should update allocation to each pool', async () => {
      // 100 per block farming rate starting at block 600
      farming = await FarmingF.deploy(ptn.address, '100', '600', minter.address);
      await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
      await lp.connect(alice).approve(farming.address, '1000');
      await lp2.connect(bob).approve(farming.address, '1000');
      // Add first LP to the pool with allocation 1
      await farming.add('10', lp.address, true, 1, '10000');
      // Alice deposits 10 LPs at block 410
      await advanceBlockTo(609);
      await farming.connect(alice).deposit(0, '10');
      // Add LP2 to the pool with allocation 2 at block 420
      await advanceBlockTo(619);
      await farming.add('20', lp2.address, true, 1, '10000');
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1000');
      // Bob deposits 10 LP2s at block 425
      await advanceBlockTo(624);
      await farming.connect(bob).deposit(1, '5');

      await advanceBlockTo(640);
      await farming.set(0, 0, true);
      await expect(farming.set(1, 0, true)).to.be.revertedWith('Should be more than zero');
      await farming.updatePtnPerBlock(0);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1266');
      await advanceBlockTo(650);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1266');
      await advanceBlockTo(660);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1266');
      await advanceBlockTo(670);
      await farming.connect(alice).deposit(0, 0);
      await farming.connect(bob).deposit(1, 0);
      expect(await farming.pendingPtn(0, alice.address)).to.equal(0);
      expect(await farming.pendingPtn(1, bob.address)).to.equal(0);
    });
  });
});
