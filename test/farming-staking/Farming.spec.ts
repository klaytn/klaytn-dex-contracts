import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Farming__factory } from '../../typechain/factories/farming/Farming__factory';
import { DexKIP7Test__factory } from '../../typechain/factories/mocks/DexKIP7Test__factory';
import { Farming } from '../../typechain/farming/Farming';
import { PlatformToken } from '../../typechain/tokens/PlatformToken';
import { DexKIP7Test } from '../../typechain/mocks/DexKIP7Test';
import { advanceBlockTo } from '../shared/utilities';

describe('Farming', () => {
  let minter: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let ptn: PlatformToken;
  let farmingFactory: Farming__factory;
  let chef: Farming;
  let lp1: DexKIP7Test;
  let lp2: DexKIP7Test;
  let lp3: DexKIP7Test;
  let lpFactory: DexKIP7Test__factory;
  beforeEach(async () => {
    [minter, alice, bob] = await ethers.getSigners();
    const ptnFactory = await ethers.getContractFactory('PlatformToken');
    lpFactory = await ethers.getContractFactory('DexKIP7Test');
    farmingFactory = await ethers.getContractFactory('Farming');
    ptn = await ptnFactory.deploy('PlatformToken', 'PTN', minter.address);
    expect(await ptn.hasRole((await ptn.DEFAULT_ADMIN_ROLE()), minter.address)).to.be.equal(true);
    lp1 = await lpFactory.deploy('1000000');
    lp2 = await lpFactory.deploy('1000000');
    lp3 = await lpFactory.deploy('1000000');
    chef = await farmingFactory.deploy(ptn.address, 1000, 100, minter.address);
    await ptn.grantRole((await ptn.MINTER_ROLE()), chef.address);
    await lp1.transfer(bob.address, '2000');
    await lp2.transfer(bob.address, '2000');
    await lp3.transfer(bob.address, '2000');

    await lp1.transfer(alice.address, '2000');
    await lp2.transfer(alice.address, '2000');
    await lp3.transfer(alice.address, '2000');
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
    await chef.add('2000', lp1.address, true, 1, '10000');
    await chef.add('1000', lp2.address, true, 1, '10000');
    await chef.add('500', lp3.address, true, 1, '10000');
    await chef.add('500', lp4.address, true, 1, '10000');
    await chef.add('500', lp5.address, true, 1, '10000');
    await chef.add('500', lp6.address, true, 1, '10000');
    await chef.add('500', lp7.address, true, 1, '10000');
    await chef.add('100', lp8.address, true, 1, '10000');
    await chef.add('100', lp9.address, true, 1, '10000');
    await chef.add('2000', lp10.address, true, 1, '10000');
    await chef.add('1000', lp11.address, true, 1, '10000');
    await chef.add('500', lp12.address, true, 1, '10000');
    await chef.add('500', lp13.address, true, 1, '10000');
    await chef.add('500', lp14.address, true, 1, '10000');
    await chef.add('500', lp15.address, true, 1, '10000');
    await chef.add('500', lp16.address, true, 1, '10000');
    await chef.add('100', lp17.address, true, 1, '10000');
    await chef.add('100', lp18.address, true, 1, '10000');
    await chef.add('2000', lp19.address, true, 1, '10000');
    await chef.add('1000', lp20.address, true, 1, '10000');
    await chef.add('500', lp21.address, true, 1, '10000');
    await chef.add('500', lp22.address, true, 1, '10000');
    await chef.add('500', lp23.address, true, 1, '10000');
    await chef.add('500', lp24.address, true, 1, '10000');
    await chef.add('500', lp25.address, true, 1, '10000');
    await chef.add('100', lp26.address, true, 1, '10000');
    await chef.add('100', lp27.address, true, 1, '10000');
    expect(await chef.poolLength()).to.be.equal(27);

    await expect(chef.add('100', lp2.address, false, 1, '10000'))
      .to.be.revertedWith('Token already added');
    await advanceBlockTo(170);
    await lp1.connect(alice).approve(chef.address, '1000');
    expect(await ptn.balanceOf(alice.address)).to.be.equal(0);
    await chef.connect(alice).deposit(0, '20');
    await chef.connect(alice).withdraw(0, '20');
    expect(await ptn.balanceOf(alice.address)).to.be.equal('116');
    expect(await lp1.balanceOf(alice.address)).to.be.equal('2000');
  });

  it('deposit/withdraw', async () => {
    await chef.add(1000, lp1.address, true, 1, '10000');
    await chef.add(1000, lp2.address, true, 1, '10000');
    await chef.add(1000, lp3.address, true, 1, '10000');

    await lp1.connect(alice).approve(chef.address, '100');
    await chef.connect(alice).deposit(0, '20');
    await chef.connect(alice).deposit(0, '0');
    await chef.connect(alice).deposit(0, '40');
    await chef.connect(alice).deposit(0, '0');
    expect(await lp1.balanceOf(alice.address)).to.be.equal('1940');
    await chef.connect(alice).withdraw(0, '10');
    expect(await lp1.balanceOf(alice.address)).to.be.equal('1950');
    expect(await ptn.balanceOf(alice.address)).to.be.equal('1332');

    await lp1.connect(bob).approve(chef.address, '100');
    expect(await lp1.balanceOf(bob.address)).to.be.equal('2000');
    await chef.connect(bob).deposit(0, '50');
    expect(await lp1.balanceOf(bob.address)).to.be.equal('1950');
    await chef.connect(bob).deposit(0, '0');
    expect(await ptn.balanceOf(bob.address)).to.be.equal('166');
    await chef.connect(bob).emergencyWithdraw(0);
    expect(await lp1.balanceOf(bob.address)).to.be.equal('2000');
  });

  it('deposit/withdraw:fail', async () => {
    await chef.add(1000, lp1.address, true, 1, '10000');
    await lp1.connect(alice).approve(chef.address, '100');

    await chef.connect(alice).deposit(0, '20');
    await chef.connect(alice).withdraw(0, '10');
    await expect(chef.connect(alice).withdraw(0, '60'))
      .to.be.revertedWith('withdraw: not good');
    await expect(chef.connect(alice).withdraw(1, '0')).to.be.reverted;
  });

  it('update multiplier', async () => {
    await chef.add('1000', lp1.address, true, 2, '10000');
    await chef.add('1000', lp2.address, true, 2, '10000');
    await chef.add('1000', lp3.address, true, 2, '10000');

    await advanceBlockTo(400);

    await chef.updateMultiplier(0, 0);
    await chef.updateMultiplier(1, 0);

    await lp1.connect(alice).approve(chef.address, '100');
    await lp1.connect(bob).approve(chef.address, '100');
    await chef.connect(alice).deposit(0, '100');
    await chef.connect(bob).deposit(0, '100');
    await chef.connect(alice).deposit(0, 0);
    await chef.connect(bob).deposit(0, 0);

    expect(await ptn.balanceOf(alice.address)).to.be.equal('0');
    expect(await ptn.balanceOf(bob.address)).to.be.equal('0');

    await chef.connect(alice).deposit(0, '0');
    await chef.connect(bob).deposit(0, '0');

    await advanceBlockTo(500);
    await chef.updatePtnPerBlock(0);

    await chef.connect(alice).deposit(0, 0);
    await chef.connect(bob).deposit(0, 0);
    expect(await ptn.balanceOf(alice.address)).to.be.equal('0');
    expect(await ptn.balanceOf(bob.address)).to.be.equal('0');

    await chef.connect(alice).withdraw(0, '100');
    await chef.connect(bob).withdraw(0, '100');
  });
});
