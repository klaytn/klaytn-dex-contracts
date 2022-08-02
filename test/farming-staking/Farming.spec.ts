import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { mineUpTo } from '@nomicfoundation/hardhat-network-helpers';
import { Farming__factory } from '../../typechain/factories/farming/Farming__factory';
import { DexKIP7Test__factory } from '../../typechain/factories/mocks/DexKIP7Test__factory';
import { Farming } from '../../typechain/farming/Farming';
import { PlatformToken } from '../../typechain/tokens/PlatformToken';
import { DexKIP7Test } from '../../typechain/mocks/DexKIP7Test';

describe('Farming', () => {
  let minter: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let multisig: SignerWithAddress;
  let ptn: PlatformToken;
  let blockNumber: number;
  let farmingFactory: Farming__factory;
  let farming: Farming;
  let lp1: DexKIP7Test;
  let lp2: DexKIP7Test;
  let lp3: DexKIP7Test;
  let lpFactory: DexKIP7Test__factory;
  beforeEach(async () => {
    [minter, alice, bob, carol, multisig] = await ethers.getSigners();
    const ptnFactory = await ethers.getContractFactory('PlatformToken');
    lpFactory = await ethers.getContractFactory('DexKIP7Test');
    farmingFactory = await ethers.getContractFactory('Farming');
    // Deploy PTN
    ptn = await ptnFactory.deploy('PlatformToken', 'PTN', multisig.address);
    expect(await ptn.hasRole((await ptn.DEFAULT_ADMIN_ROLE()), multisig.address)).to.be.equal(true);
    // Deploy LPs
    lp1 = await lpFactory.deploy('1000000');
    lp2 = await lpFactory.deploy('1000000');
    lp3 = await lpFactory.deploy('1000000');
    // Deploy farming
    blockNumber = await ethers.provider.getBlockNumber();
    farming = await farmingFactory.deploy(ptn.address, 1000, blockNumber, minter.address);
    await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);
    // Token transfers
    await lp1.transfer(bob.address, '2000');
    await lp2.transfer(bob.address, '2000');
    await lp3.transfer(bob.address, '2000');

    await lp1.transfer(alice.address, '2000');
    await lp2.transfer(alice.address, '2000');
    await lp3.transfer(alice.address, '2000');

    await lp1.transfer(carol.address, '2000');
    await lp2.transfer(carol.address, '2000');
    await lp3.transfer(carol.address, '2000');
  });
  it('real case', async () => {
    const lp4 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp5 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp6 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp7 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp8 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp9 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp10 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp11 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp12 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp13 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp14 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp15 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp16 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp17 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp18 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp19 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp20 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp21 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp22 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp23 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp24 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp25 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp26 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    const lp27 = await lpFactory.deploy(ethers.utils.parseEther('1000000'));
    await farming.add('2000', lp1.address, true, 1, blockNumber + 10000);
    await farming.add('1000', lp2.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp3.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp4.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp5.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp6.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp7.address, true, 1, blockNumber + 10000);
    await farming.add('100', lp8.address, true, 1, '10000');
    await farming.add('100', lp9.address, true, 1, '10000');
    await farming.add('2000', lp10.address, true, 1, '10000');
    await farming.add('1000', lp11.address, true, 1, '10000');
    await farming.add('500', lp12.address, true, 1, '10000');
    await farming.add('500', lp13.address, true, 1, '10000');
    await farming.add('500', lp14.address, true, 1, '10000');
    await farming.add('500', lp15.address, true, 1, '10000');
    await farming.add('500', lp16.address, true, 1, '10000');
    await farming.add('100', lp17.address, true, 1, '10000');
    await farming.add('100', lp18.address, true, 1, '10000');
    await farming.add('2000', lp19.address, true, 1, '10000');
    await farming.add('1000', lp20.address, true, 1, '10000');
    await farming.add('500', lp21.address, true, 1, '10000');
    await farming.add('500', lp22.address, true, 1, '10000');
    await farming.add('500', lp23.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp24.address, true, 1, blockNumber + 10000);
    await farming.add('500', lp25.address, true, 1, blockNumber + 10000);
    await farming.add('100', lp26.address, true, 1, blockNumber + 10000);
    await farming.add('100', lp27.address, true, 1, blockNumber + 10000);
    expect(await farming.poolLength()).to.be.equal(27);

    await expect(farming.add('100', lp2.address, false, 1, '10000'))
      .to.be.revertedWith('Token already added');
    await mineUpTo(blockNumber + 170);
    await lp1.connect(alice).approve(farming.address, '1000');
    expect(await ptn.balanceOf(alice.address)).to.be.equal(0);
    await farming.connect(alice).deposit(0, '20');
    await farming.connect(alice).withdraw(0, '20');
    expect(await ptn.balanceOf(alice.address)).to.be.equal('116');
    expect(await lp1.balanceOf(alice.address)).to.be.equal('2000');
  });

  it('deposit/withdraw', async () => {
    await farming.add(1000, lp1.address, true, 1, blockNumber + 10000);
    await farming.add(1000, lp2.address, true, 1, blockNumber + 10000);
    await farming.add(1000, lp3.address, true, 1, blockNumber + 10000);

    await lp1.connect(alice).approve(farming.address, '100');
    await farming.connect(alice).deposit(0, '20');
    await farming.connect(alice).deposit(0, '0');
    await farming.connect(alice).deposit(0, '40');
    await farming.connect(alice).deposit(0, '0');
    expect(await lp1.balanceOf(alice.address)).to.be.equal('1940');
    await farming.connect(alice).withdraw(0, '10');
    expect(await lp1.balanceOf(alice.address)).to.be.equal('1950');
    expect(await ptn.balanceOf(alice.address)).to.be.equal('1332');

    await lp1.connect(bob).approve(farming.address, '100');
    expect(await lp1.balanceOf(bob.address)).to.be.equal('2000');
    await farming.connect(bob).deposit(0, '50');
    expect(await lp1.balanceOf(bob.address)).to.be.equal('1950');
    await farming.connect(bob).deposit(0, '0');
    expect(await ptn.balanceOf(bob.address)).to.be.equal('166');
    await farming.connect(bob).emergencyWithdraw(0);
    expect(await lp1.balanceOf(bob.address)).to.be.equal('2000');
  });

  it('deposit/withdraw:fail', async () => {
    await farming.add(1000, lp1.address, true, 1, blockNumber + 10000);
    await lp1.connect(alice).approve(farming.address, '100');

    await farming.connect(alice).deposit(0, '20');
    await farming.connect(alice).withdraw(0, '10');
    await expect(farming.connect(alice).withdraw(0, '60'))
      .to.be.revertedWith('withdraw: not good');
    await expect(farming.connect(alice).withdraw(1, '0')).to.be.reverted;
  });

  it('update multiplier', async () => {
    await farming.add('1000', lp1.address, true, 2, blockNumber + 10000);
    await farming.add('1000', lp2.address, true, 2, blockNumber + 10000);
    await farming.add('1000', lp3.address, true, 2, blockNumber + 10000);

    await mineUpTo(blockNumber + 400);

    await farming.updateMultiplier(0, 0);
    await farming.updateMultiplier(1, 0);

    await lp1.connect(alice).approve(farming.address, '100');
    await lp1.connect(bob).approve(farming.address, '100');
    await farming.connect(alice).deposit(0, '100');
    await farming.connect(bob).deposit(0, '100');
    await farming.connect(alice).deposit(0, 0);
    await farming.connect(bob).deposit(0, 0);

    expect(await ptn.balanceOf(alice.address)).to.be.equal('0');
    expect(await ptn.balanceOf(bob.address)).to.be.equal('0');

    await farming.connect(alice).deposit(0, '0');
    await farming.connect(bob).deposit(0, '0');

    await mineUpTo(blockNumber + 500);
    await farming.updatePtnPerBlock(0);

    await farming.connect(alice).deposit(0, 0);
    await farming.connect(bob).deposit(0, 0);
    expect(await ptn.balanceOf(alice.address)).to.be.equal('0');
    expect(await ptn.balanceOf(bob.address)).to.be.equal('0');

    await farming.connect(alice).withdraw(0, '100');
    await farming.connect(bob).withdraw(0, '100');
  });
  describe('Farming Redeployable test', () => {
    it('should set correct state variables', async () => {
      farming = await farmingFactory.deploy(ptn.address, '1000', '0', minter.address);
      await farming.deployed();
      expect(await ptn.hasRole(
        (await ptn.DEFAULT_ADMIN_ROLE()),
        multisig.address,
      )).to.be.equal(true);
      await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);

      const ptnAddress = await farming.ptn();

      expect(ptnAddress).to.equal(ptn.address);
      expect(await ptn.hasRole((await ptn.MINTER_ROLE()), farming.address)).to.be.equal(true);
    });
    it('should allow emergency withdraw', async () => {
      // 100 per block farming rate starting at block `blockNumber + 100`
      // with bonus until block 1000
      farming = await farmingFactory.deploy(ptn.address, '100', blockNumber + 100, minter.address);
      await farming.deployed();

      await farming.add('100', lp1.address, true, 1, '10000');

      await lp1.connect(bob).approve(farming.address, '1000');

      await farming.connect(bob).deposit(0, '100');

      expect(await lp1.balanceOf(bob.address)).to.equal('1900');

      await farming.connect(bob).emergencyWithdraw(0);

      expect(await lp1.balanceOf(bob.address)).to.equal('2000');
    });

    it('should give out PTNs only after farming time [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block `blockNumber + 100`
      farming = await farmingFactory.deploy(ptn.address, '1000', blockNumber + 100, minter.address);
      await farming.deployed();
      await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);

      lp3 = await lpFactory.deploy('10000000000');
      const lp4 = await lpFactory.deploy('10000000000');
      const lp5 = await lpFactory.deploy('10000000000');
      const lp6 = await lpFactory.deploy('10000000000');
      const lp7 = await lpFactory.deploy('10000000000');
      const lp8 = await lpFactory.deploy('10000000000');
      const lp9 = await lpFactory.deploy('10000000000');

      await farming.add('2000', lp1.address, true, 1, '10000');
      await farming.add('1000', lp2.address, true, 1, '10000');
      await farming.add('500', lp3.address, true, 1, '10000');
      await farming.add('500', lp4.address, true, 1, '10000');
      await farming.add('500', lp5.address, true, 1, '10000');
      await farming.add('500', lp6.address, true, 1, '10000');
      await farming.add('500', lp7.address, true, 1, '10000');
      await farming.add('100', lp8.address, true, 1, '10000');
      await farming.add('100', lp9.address, true, 1, '10000');

      expect(await farming.poolLength()).to.be.equal(9);

      await lp1.connect(bob).approve(farming.address, '1000');
      await farming.connect(bob).deposit(0, '20');
      await mineUpTo(blockNumber + 89);

      await farming.connect(bob).deposit(0, '0'); // block `blockNumber + 90`
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      await mineUpTo(blockNumber + 94);

      await farming.connect(bob).deposit(0, '0'); // block `blockNumber + 95`
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      await mineUpTo(blockNumber + 99);

      await farming.connect(bob).deposit(0, '0'); // block `blockNumber + 100`
      expect(await ptn.balanceOf(bob.address)).to.equal('0');

      await farming.connect(bob).deposit(0, '0'); // block `blockNumber + 101`
      expect(await ptn.balanceOf(bob.address)).to.equal('350');

      await mineUpTo(blockNumber + 104);
      await farming.connect(bob).deposit(0, '0'); // block `blockNumber + 105`

      expect(await ptn.balanceOf(bob.address)).to.equal('1753');
      expect(await ptn.totalSupply()).to.equal('1753');
    });

    it('should not distribute ptns if no one deposit [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block `blockNumber + 200`
      farming = await farmingFactory.deploy(ptn.address, '1000', blockNumber + 200, minter.address);
      lp3 = await lpFactory.deploy('10000000000');
      await farming.deployed();
      await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);
      await farming.add('1000', lp1.address, true, 1, '10000');
      await farming.add('1000', lp2.address, true, 1, '10000');
      await farming.add('1000', lp3.address, true, 1, '10000');
      await lp1.connect(bob).approve(farming.address, '1000');
      await mineUpTo(blockNumber + 199);
      expect(await ptn.totalSupply()).to.equal('0');
      await mineUpTo(blockNumber + 204);
      expect(await ptn.totalSupply()).to.equal('0');
      await mineUpTo(blockNumber + 209);
      await farming.connect(bob).deposit(0, '20'); // block 210
      expect(await ptn.totalSupply()).to.equal('0');
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      expect(await lp1.balanceOf(bob.address)).to.equal('1980');
      await mineUpTo(blockNumber + 219);
      await farming.connect(bob).withdraw(0, '10'); // block 220
      expect(await ptn.totalSupply()).to.equal('3333');
      expect(await ptn.balanceOf(bob.address)).to.equal('3333');
      expect(await lp1.balanceOf(bob.address)).to.equal('1990');
    });

    it('should distribute ptns properly for each staker [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block `blockNumber + 300`
      farming = await farmingFactory.deploy(ptn.address, '100', blockNumber + 300, minter.address);
      await farming.deployed();
      await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);
      await farming.add('100', lp1.address, true, 1, '10000');
      await lp1.connect(alice).approve(farming.address, '1000');
      await lp1.connect(bob).approve(farming.address, '1000');
      await lp1.connect(carol).approve(farming.address, '1000');
      // Alice deposits 10 LPs at block `blockNumber + 310`
      await mineUpTo(blockNumber + 309);
      await farming.connect(alice).deposit(0, '10');
      // Bob deposits 20 LPs at block `blockNumber + 314`
      await mineUpTo(blockNumber + 313);
      await farming.connect(bob).deposit(0, '20');
      // Carol deposits 30 LPs at block `blockNumber + 318`
      await mineUpTo(blockNumber + 317);
      await farming.connect(carol).deposit(0, '30');
      // Alice deposits 10 more LPs at block `blockNumber + 320`. At this point:
      await mineUpTo(blockNumber + 319);
      await farming.connect(alice).deposit(0, '10');
      expect(await ptn.totalSupply()).to.equal('1000');
      expect(await ptn.balanceOf(alice.address)).to.equal('566');
      expect(await ptn.balanceOf(bob.address)).to.equal('0');
      expect(await ptn.balanceOf(carol.address)).to.equal('0');
      expect(await ptn.balanceOf(farming.address)).to.equal('434');
      // Bob withdraws 5 LPs at block `blockNumber + 330`. At this point:
      await mineUpTo(blockNumber + 329);
      await farming.connect(bob).withdraw(0, '5');
      expect(await ptn.totalSupply()).to.equal('2000');
      expect(await ptn.balanceOf(alice.address)).to.equal('566');
      expect(await ptn.balanceOf(bob.address)).to.equal('619');
      expect(await ptn.balanceOf(carol.address)).to.equal('0');
      expect(await ptn.balanceOf(farming.address)).to.equal('815');
      // Alice withdraws 20 LPs at block `blockNumber + 340`.
      // Bob withdraws 15 LPs at block `blockNumber + 350`.
      // Carol withdraws 30 LPs at block `blockNumber + 360`.
      await mineUpTo(blockNumber + 339);
      await farming.connect(alice).withdraw(0, '20');
      await mineUpTo(blockNumber + 349);
      await farming.connect(bob).withdraw(0, '15');
      await mineUpTo(blockNumber + 359);
      await farming.connect(carol).withdraw(0, '30');
      expect(await ptn.totalSupply()).to.equal('5000');
      expect(await ptn.balanceOf(alice.address)).to.equal('1159');
      expect(await ptn.balanceOf(bob.address)).to.equal('1183');
      expect(await ptn.balanceOf(carol.address)).to.equal('2657');
      // All of them should have 1000 LPs back.
      expect(await lp1.balanceOf(alice.address)).to.equal('2000');
      expect(await lp1.balanceOf(bob.address)).to.equal('2000');
      expect(await lp1.balanceOf(carol.address)).to.equal('2000');
    });

    // it('should distribute ptns properly for each staker on coverage', async () => {
    // //   // 100 per block farming rate starting at block 300
    //   farming = await farmingFactory.deploy(ptn.address, '100', '300', minter.address);
    //   await farming.deployed();
    //   await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
    //   await farming.add('100', lp.address, true, 1, '10000');
    //   await lp.connect(alice).approve(farming.address, '1000');
    //   await lp.connect(bob).approve(farming.address, '1000');
    //   await lp.connect(carol).approve(farming.address, '1000');
    //   // Alice deposits 10 LPs at block 310
    //   await mineUpTo(309);
    //   await farming.connect(alice).deposit(0, '10');
    //   // Bob deposits 20 LPs at block 314
    //   await mineUpTo(313);
    //   await farming.connect(bob).deposit(0, '20');
    //   // Carol deposits 30 LPs at block 318
    //   await mineUpTo(317);
    //   await farming.connect(carol).deposit(0, '30');
    //   // Alice deposits 10 more LPs at block 320. At this point:
    //   await mineUpTo(319);
    //   await farming.connect(alice).deposit(0, '10');
    //   // Bob withdraws 5 LPs at block 330. At this point:
    //   await mineUpTo(329);
    //   await farming.connect(bob).withdraw(0, '5');
    //   // Alice withdraws 20 LPs at block 340.
    //   // Bob withdraws 15 LPs at block 350.
    //   // Carol withdraws 30 LPs at block 360.
    //   await mineUpTo(339);
    //   await farming.connect(alice).withdraw(0, '20');
    //   await mineUpTo(349);
    //   await farming.connect(bob).withdraw(0, '15');
    //   await mineUpTo(359);
    //   await farming.connect(carol).withdraw(0, '30');
    //   // All of them should have 1000 LPs back.
    //   expect(await lp.balanceOf(alice.address)).to.equal('1000');
    //   expect(await lp.balanceOf(bob.address)).to.equal('1000');
    //   expect(await lp.balanceOf(carol.address)).to.equal('1000');
    // });

    it('should give proper ptns allocation to each pool [ @skip-on-coverage ]', async () => {
      // 100 per block farming rate starting at block `blockNumber + 400`
      farming = await farmingFactory.deploy(ptn.address, '100', blockNumber + 400, minter.address);
      await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);
      await lp1.connect(alice).approve(farming.address, '1000');
      await lp2.connect(bob).approve(farming.address, '1000');
      // Add first LP to the pool with allocation 1
      await farming.add('10', lp1.address, true, 1, '10000');
      // Alice deposits 10 LPs at block `blockNumber + 410`
      await mineUpTo(blockNumber + 409);
      await farming.connect(alice).deposit(0, '10');
      // Add LP2 to the pool with allocation 2 at block `blockNumber + 420`
      await mineUpTo(blockNumber + 419);
      await farming.add('20', lp2.address, true, 1, '10000');

      // Alice should have 1000 pending reward
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1000');
      // Bob deposits 10 LP2s at block `blockNumber + 425`
      await mineUpTo(blockNumber + 424);
      await farming.connect(bob).deposit(1, '5');

      // Alice should have 1166 pending reward
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1166');
      await mineUpTo(blockNumber + 430);

      // Alice should have 1333 pending reward
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1333');

      // Bob should have 333 pending reward
      expect(await farming.pendingPtn(1, bob.address)).to.equal('333');

      await mineUpTo(blockNumber + 440);
      await farming.updatePtnPerBlock(0);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
      await mineUpTo(blockNumber + 450);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
      await mineUpTo(blockNumber + 460);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
      await mineUpTo(blockNumber + 550);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1066');
    });
    // it('should give proper ptns allocation to each pool on-coverage', async () => {
    //   // 100 per block farming rate starting at block 400
    //   farming = await farmingFactory.deploy(ptn.address, '100', '400', minter.address);
    //   await ptn.grantRole((await ptn.MINTER_ROLE()), farming.address);
    //   await lp.connect(alice).approve(farming.address, '1000');
    //   await lp2.connect(bob).approve(farming.address, '1000');
    //   // Add first LP to the pool with allocation 1
    //   await farming.add('10', lp.address, true, 1, '10000');
    //   // Alice deposits 10 LPs at block 410
    //   await mineUpTo(409);
    //   await farming.connect(alice).deposit(0, '10');
    //   // Add LP2 to the pool with allocation 2 at block 420
    //   await mineUpTo(419);
    //   await farming.add('20', lp2.address, true, 1, '10000');

    //   // Bob deposits 10 LP2s at block 425
    //   await mineUpTo(424);
    //   await farming.connect(bob).deposit(1, '5');

    //   await mineUpTo(430);

    //   await mineUpTo(440);
    //   await farming.updatePtnPerBlock(0);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    //   await mineUpTo(450);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    //   await mineUpTo(460);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    //   await mineUpTo(550);
    //   expect(await farming.pendingPtn(0, alice.address)).to.equal('166');
    //   expect(await farming.pendingPtn(1, bob.address)).to.equal('66');
    // });

    it('should update allocation to each pool', async () => {
      // 100 per block farming rate starting at block `blockNumber + 600`
      farming = await farmingFactory.deploy(ptn.address, '100', blockNumber + 600, minter.address);
      await ptn.connect(multisig).grantRole((await ptn.MINTER_ROLE()), farming.address);
      await lp1.connect(alice).approve(farming.address, '1000');
      await lp2.connect(bob).approve(farming.address, '1000');
      // Add first LP to the pool with allocation 1
      await farming.add('10', lp1.address, true, 1, '10000');
      // Alice deposits 10 LPs at block `blockNumber + 610`
      await mineUpTo(blockNumber + 609);
      await farming.connect(alice).deposit(0, '10');
      // Add LP2 to the pool with allocation 2 at block `blockNumber + 620`
      await mineUpTo(blockNumber + 619);
      await farming.add('20', lp2.address, true, 1, '10000');
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1000');
      // Bob deposits 10 LP2s at block `blockNumber + 625`
      await mineUpTo(blockNumber + 624);
      await farming.connect(bob).deposit(1, '5');

      await mineUpTo(blockNumber + 640);
      await farming.set(0, 0, true);
      await expect(farming.set(1, 0, true)).to.be.revertedWith('Should be more than zero');
      await farming.updatePtnPerBlock(0);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1266');
      await mineUpTo(blockNumber + 650);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1266');
      await mineUpTo(blockNumber + 660);
      expect(await farming.pendingPtn(0, alice.address)).to.equal('1700');
      expect(await farming.pendingPtn(1, bob.address)).to.equal('1266');
      await mineUpTo(blockNumber + 670);
      await farming.connect(alice).deposit(0, 0);
      await farming.connect(bob).deposit(1, 0);
      expect(await farming.pendingPtn(0, alice.address)).to.equal(0);
      expect(await farming.pendingPtn(1, bob.address)).to.equal(0);
    });
  });
});
