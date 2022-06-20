// import { ethers } from 'hardhat';
// import { expect } from 'chai';
// import { Contract, ContractFactory } from 'ethers';
// import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
// import { advanceBlockTo } from '../shared/utilities';

// describe('Staking', () => {
//   let minter: SignerWithAddress;
//   let alice: SignerWithAddress;
//   let bob: SignerWithAddress;
//   let carol: SignerWithAddress;
//   let Staking: ContractFactory;
//   let PTN: ContractFactory;
//   let Token: ContractFactory;
//   let ptn: Contract;
//   let staking: Contract;
//   let token: Contract;
//   let token2: Contract;
//   before(async () => {
//     [minter, alice, bob, carol] = await ethers.getSigners();
//     Staking = await ethers.getContractFactory('Staking');
//     PTN = await ethers.getContractFactory('PlatformToken');
//     Token = await ethers.getContractFactory('KIP7Mock');
//   });

//   beforeEach(async () => {
//     ptn = await PTN.deploy('Platform Token', 'PTN', minter.address);
//     await ptn.deployed();
//   });

//   it('should set correct state variables', async () => {
//     staking = await Staking.deploy(ptn.address, '1000', '0');
//     await staking.deployed();
//     expect(await ptn.hasRole(
//       (await ptn.DEFAULT_ADMIN_ROLE()),
//       minter.address,
//     )).to.be.equal(true);
//     await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);

//     const ptnAddress = await staking.ptn();
//     expect(ptnAddress).to.equal(ptn.address);
//     expect(await ptn.hasRole((await ptn.MINTER_ROLE()), staking.address)).to.be.equal(true);
//   });

//   context('With ERC/token token added to the field', () => {
//     beforeEach(async () => {
//       token = await Token.deploy('10000000000');

//       await token.transfer(alice.address, '1000');
//       await token.transfer(bob.address, '1000');
//       await token.transfer(carol.address, '1000');

//       token2 = await Token.deploy('10000000000');

//       await token2.transfer(alice.address, '1000');
//       await token2.transfer(bob.address, '1000');
//       await token2.transfer(carol.address, '1000');
//     });

//     it('should allow emergency withdraw', async () => {
//       // 100 per block staking rate starting at block 100
//       staking = await Staking.deploy(ptn.address, '100', '10');
//       await staking.deployed();

//       await staking.add('100', token.address, true, '10');

//       await token.connect(bob).approve(staking.address, '1000');

//       await staking.connect(bob).deposit(0, '100');

//       expect(await token.balanceOf(bob.address)).to.equal('900');

//       await expect(staking.connect(bob).emergencyWithdraw(0))
//         .to.emit(staking, 'EmergencyWithdraw')
//         .withArgs(bob.address, 0, '100');

//       expect(await token.balanceOf(bob.address)).to.equal('1000');
//       await staking.set(0, 10, true);
//       expect(await token.balanceOf(bob.address)).to.equal('1000');
//     });

//     it('should give out PTNs only after staking time [ @skip-on-coverage ]', async () => {
//       // 100 per block staking rate starting at block 100
//       staking = await Staking.deploy(ptn.address, '100', '100');
//       await staking.deployed();
//       await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);

//       await expect(staking.add('100', token.address, true, '10'))
//         .to.emit(staking, 'AddPool')
//         .withArgs(0, '100', token.address, '10');

//       expect(await staking.poolLength()).to.be.equal(1);

//       await token.connect(bob).approve(staking.address, '1000');
//       await expect(staking.connect(bob).deposit(0, '20'))
//         .to.emit(staking, 'Deposit')
//         .withArgs(bob.address, 0, '20');
//       await advanceBlockTo(89);

//       await staking.connect(bob).deposit(0, '0'); // block 90
//       expect(await ptn.balanceOf(bob.address)).to.equal('0');
//       await advanceBlockTo(94);

//       await staking.connect(bob).deposit(0, '0'); // block 95
//       expect(await ptn.balanceOf(bob.address)).to.equal('0');
//       await advanceBlockTo(99);

//       await staking.connect(bob).deposit(0, '0'); // block 100
//       expect(await ptn.balanceOf(bob.address)).to.equal('0');
//       await advanceBlockTo(100);

//       await staking.connect(bob).deposit(0, '0'); // block 101
//       expect(await ptn.balanceOf(bob.address)).to.equal('1000');

//       await advanceBlockTo(104);
//       await staking.connect(bob).deposit(0, '0'); // block 105

//       expect(await ptn.balanceOf(bob.address)).to.equal('5000');
//       expect(await ptn.totalSupply()).to.equal('5000');
//     });

//     // it('should give out PTNs only after staking time on coverage', async () => {
//     //   // 100 per block staking rate starting at block 100
//     //   staking = await Staking.deploy(ptn.address, '100', '100');
//     //   await staking.deployed();
//     //   await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);

//     //   await expect(staking.add('100', token.address, true, '10'))
//     //     .to.emit(staking, 'AddPool')
//     //     .withArgs(0, '100', token.address, '10');

//     //   expect(await staking.poolLength()).to.be.equal(1);

//     //   await token.connect(bob).approve(staking.address, '1000');
//     //   await expect(staking.connect(bob).deposit(0, '20'))
//     //     .to.emit(staking, 'Deposit')
//     //     .withArgs(bob.address, 0, '20');
//     //   await advanceBlockTo(89);

//     //   await staking.connect(bob).deposit(0, '0'); // block 90
//     //   await advanceBlockTo(94);

//     //   await staking.connect(bob).deposit(0, '0'); // block 95
//     //   await advanceBlockTo(99);

//     //   await staking.connect(bob).deposit(0, '0'); // block 100
//     //   await advanceBlockTo(100);

//     //   await staking.connect(bob).deposit(0, '0'); // block 101

//     //   await advanceBlockTo(104);
//     //   await staking.connect(bob).deposit(0, '0'); // block 105
//     // });

//     it('should not distribute ptns if no one deposit [ @skip-on-coverage ]', async () => {
//       // 100 per block staking rate starting at block 200
//       staking = await Staking.deploy(ptn.address, '100', '200');
//       const token3 = await Token.deploy('10000000000');
//       await staking.deployed();
//       await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);
//       await staking.add('1000', token.address, true, '10');
//       await staking.add('1000', token2.address, true, '1');
//       await staking.add('1000', token3.address, true, '1');
//       await token.connect(bob).approve(staking.address, '1000');
//       await advanceBlockTo(199);
//       expect(await ptn.totalSupply()).to.equal('0');
//       await advanceBlockTo(204);
//       expect(await ptn.totalSupply()).to.equal('0');
//       await advanceBlockTo(209);
//       await expect(staking.connect(bob).deposit(0, '20'))
//         .to.emit(staking, 'Deposit')
//         .withArgs(bob.address, 0, '20')
//         .to.emit(staking, 'UpdatePool')
//         .withArgs(0, 210, 0, 0); // block 210
//       expect(await ptn.totalSupply()).to.equal('0');
//       expect(await ptn.balanceOf(bob.address)).to.equal('0');
//       expect(await token.balanceOf(bob.address)).to.equal('980');
//       await advanceBlockTo(219);
//       await staking.connect(bob).withdraw(0, '10'); // block 220
//       expect(await ptn.totalSupply()).to.equal('3333');
//       expect(await ptn.balanceOf(bob.address)).to.equal('3333');
//       expect(await token.balanceOf(bob.address)).to.equal('990');
//     });

//     // it('should not distribute ptns if no one deposit on coverage', async () => {
//     //   // 100 per block staking rate starting at block 200
//     //   staking = await Staking.deploy(ptn.address, '100', '200');
//     //   const token3 = await Token.deploy('10000000000');
//     //   await staking.deployed();
//     //   await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);
//     //   await staking.add('1000', token.address, true, '10');
//     //   await staking.add('1000', token2.address, true, '1');
//     //   await staking.add('1000', token3.address, true, '1');
//     //   await token.connect(bob).approve(staking.address, '1000');
//     //   await advanceBlockTo(199);
//     //   expect(await ptn.totalSupply()).to.equal('0');
//     //   await advanceBlockTo(204);
//     //   expect(await ptn.totalSupply()).to.equal('0');
//     //   await advanceBlockTo(209);
//     //   await expect(staking.connect(bob).deposit(0, '20'))
//     //     .to.emit(staking, 'Deposit')
//     //     .withArgs(bob.address, 0, '20')
//     //     .to.emit(staking, 'UpdatePool'); // block 210(724 on coverage)
//     //   await advanceBlockTo(219);
//     //   await staking.connect(bob).withdraw(0, '10'); // block 220
//     // });

//     it('should distribute ptns properly for each staker [ @skip-on-coverage ]', async () => {
//       // 100 per block staking rate starting at block 300
//       staking = await Staking.deploy(ptn.address, '100', '300');
//       await staking.deployed();
//       await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);
//       await staking.add('100', token.address, true, '10');
//       await token.connect(alice).approve(staking.address, '1000');
//       await token.connect(bob).approve(staking.address, '1000');
//       await token.connect(carol).approve(staking.address, '1000');
//       // Alice deposits 10 tokens at block 310
//       await advanceBlockTo(309);
//       await staking.connect(alice).deposit(0, '10');
//       // Bob deposits 20 tokens at block 314
//       await advanceBlockTo(313);
//       await expect(staking.connect(bob).deposit(0, '20'))
//         .to.emit(staking, 'Deposit')
//         .withArgs(bob.address, 0, '20')
//         .to.emit(staking, 'UpdatePool')
//         .withArgs(0, 314, 10, '400000000000000');
//       // Carol deposits 30 tokens at block 318
//       await advanceBlockTo(317);
//       await staking.connect(carol).deposit(0, '30');
//       // Alice deposits 10 more tokens at block 320. At this point:
//       await advanceBlockTo(319);
//       await staking.connect(alice).deposit(0, '10');
//       expect(await ptn.totalSupply()).to.equal('10000');
//       expect(await ptn.balanceOf(alice.address)).to.equal('5666');
//       expect(await ptn.balanceOf(bob.address)).to.equal('0');
//       expect(await ptn.balanceOf(carol.address)).to.equal('0');
//       expect(await ptn.balanceOf(staking.address)).to.equal('4334');
//       // Bob withdraws 5 tokens at block 330. At this point:
//       await advanceBlockTo(329);
//       await expect(staking.connect(bob).withdraw(0, '5'))
//         .to.emit(staking, 'Withdraw')
//         .withArgs(bob.address, 0, '5');
//       expect(await ptn.totalSupply()).to.equal('20000');
//       expect(await ptn.balanceOf(alice.address)).to.equal('5666');
//       expect(await ptn.balanceOf(bob.address)).to.equal('6190');
//       expect(await ptn.balanceOf(carol.address)).to.equal('0');
//       expect(await ptn.balanceOf(staking.address)).to.equal('8144');
//       // Alice withdraws 20 tokens at block 340.
//       // Bob withdraws 15 tokens at block 350.
//       // Carol withdraws 30 tokens at block 360.
//       await advanceBlockTo(339);
//       await staking.connect(alice).withdraw(0, '20');

//       await advanceBlockTo(349);
//       await staking.connect(bob).withdraw(0, '15');

//       await advanceBlockTo(359);
//       await staking.connect(carol).withdraw(0, '30');
//       expect(await ptn.totalSupply()).to.equal('50000');
//       expect(await ptn.balanceOf(alice.address)).to.equal('11600');
//       expect(await ptn.balanceOf(bob.address)).to.equal('11831');
//       expect(await ptn.balanceOf(carol.address)).to.equal('26568');
//       // All of them should have 1000 tokens back.
//       expect(await token.balanceOf(alice.address)).to.equal('1000');
//       expect(await token.balanceOf(bob.address)).to.equal('1000');
//       expect(await token.balanceOf(carol.address)).to.equal('1000');
//       await staking.updatePtnPerBlock(0);
//       await expect(staking.connect(carol).withdraw(0, '300000'))
//         .to.be.revertedWith('withdraw: not good');
//     });

//     // it('should distribute ptns properly for each staker on coverage', async () => {
//     //   // 100 per block staking rate starting at block 300
//     //   staking = await Staking.deploy(ptn.address, '100', '300');
//     //   await staking.deployed();
//     //   await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);
//     //   await staking.add('100', token.address, true, '10');
//     //   await token.connect(alice).approve(staking.address, '1000');
//     //   await token.connect(bob).approve(staking.address, '1000');
//     //   await token.connect(carol).approve(staking.address, '1000');
//     //   // Alice deposits 10 tokens at block 310
//     //   await advanceBlockTo(309);
//     //   await staking.connect(alice).deposit(0, '10');
//     //   // Bob deposits 20 tokens at block 314
//     //   await advanceBlockTo(313);
//     //   await expect(staking.connect(bob).deposit(0, '20'))
//     //     .to.emit(staking, 'Deposit')
//     //     .withArgs(bob.address, 0, '20')
//     //     .to.emit(staking, 'UpdatePool'); // on coverage block number is 741
//     //   // Carol deposits 30 tokens at block 318
//     //   await advanceBlockTo(317);
//     //   await staking.connect(carol).deposit(0, '30');
//     //   // Alice deposits 10 more tokens at block 320. At this point:
//     //   await advanceBlockTo(319);
//     //   await staking.connect(alice).deposit(0, '10');
//     //   // Bob withdraws 5 tokens at block 330. At this point:
//     //   await advanceBlockTo(329);
//     //   await expect(staking.connect(bob).withdraw(0, '5'))
//     //     .to.emit(staking, 'Withdraw')
//     //     .withArgs(bob.address, 0, '5');
//     //   // Alice withdraws 20 tokens at block 340.
//     //   // Bob withdraws 15 tokens at block 350.
//     //   // Carol withdraws 30 tokens at block 360.
//     //   await advanceBlockTo(339);
//     //   await staking.connect(alice).withdraw(0, '20');

//     //   await advanceBlockTo(349);
//     //   await staking.connect(bob).withdraw(0, '15');

//     //   await advanceBlockTo(359);
//     //   await staking.connect(carol).withdraw(0, '30');
//     //   // All of them should have 1000 tokens back.
//     //   await staking.updatePtnPerBlock(0);
//     //   await expect(staking.connect(carol).withdraw(0, '300000'))
//     //     .to.be.revertedWith('withdraw: not good');
//     // });

//     it('should give proper ptns allocation to each pool
//       with updatePtnPerBlock [ @skip-on-coverage ]', async () => {
//       // 100 per block staking rate starting at block 400
//       staking = await Staking.deploy(ptn.address, '100', '400');
//       await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);
//       await token.connect(alice).approve(staking.address, '1000');
//       await token2.connect(bob).approve(staking.address, '1000');
//       // Add first token to the pool with allocation 1
//       await staking.add('10', token.address, true, '10');
//       // Alice deposits 10 tokens at block 410
//       await advanceBlockTo(409);
//       await staking.connect(alice).deposit(0, '10');
//       // Add token2 to the pool with allocation 2 at block 420
//       await advanceBlockTo(419);
//       await staking.add('20', token2.address, true, '1');
//       // Alice should have 10*1000 pending reward
//       expect(await staking.pendingPtn(0, alice.address)).to.equal('10000');
//       // Bob deposits 10 token2s at block 425
//       await advanceBlockTo(424);
//       await staking.connect(bob).deposit(1, '5');
//       // Alice should have 10000 + 5*1/3*1000 = 11666 pending reward
//       expect(await staking.pendingPtn(0, alice.address)).to.equal('11666');
//       await advanceBlockTo(430);
//       // At block 430. Bob should get 5*2/3*100 = 333. Alice should get ~1666 more.
//       expect(await staking.pendingPtn(0, alice.address)).to.equal('13333');
//       expect(await staking.pendingPtn(1, bob.address)).to.equal('333');

//       await staking.updatePtnPerBlock(0);
//       expect(await staking.pendingPtn(0, alice.address)).to.equal('13666');
//       expect(await staking.pendingPtn(1, bob.address)).to.equal('400');

//       await advanceBlockTo(490);
//       await staking.updateMultiplier(0, 0);
//       expect(await staking.pendingPtn(0, alice.address)).to.equal('13666');
//       expect(await staking.pendingPtn(1, bob.address)).to.equal('400');
//       await staking.connect(alice).deposit(0, '0');
//       await staking.connect(bob).deposit(1, '0');

//       await advanceBlockTo(560);
//       expect(await staking.pendingPtn(0, alice.address)).to.equal('0');
//       expect(await staking.pendingPtn(1, bob.address)).to.equal('0');
//     });

//     // it('should give proper ptns allocation to each pool with
//     //     updatePtnPerBlock on coverage', async () => {
//     //   // 100 per block staking rate starting at block 400
//     //   staking = await Staking.deploy(ptn.address, '100', '400');
//     //   await ptn.grantRole((await ptn.MINTER_ROLE()), staking.address);
//     //   await token.connect(alice).approve(staking.address, '1000');
//     //   await token2.connect(bob).approve(staking.address, '1000');
//     //   // Add first token to the pool with allocation 1
//     //   await staking.add('10', token.address, true, '10');
//     //   // Alice deposits 10 tokens at block 410
//     //   await advanceBlockTo(409);
//     //   await staking.connect(alice).deposit(0, '10');
//     //   // Add token2 to the pool with allocation 2 at block 420
//     //   await advanceBlockTo(419);
//     //   await staking.add('20', token2.address, true, '1');
//     //   // Alice should have 10*1000 pending reward
//     //   // Bob deposits 10 token2s at block 425
//     //   await advanceBlockTo(424);
//     //   await staking.connect(bob).deposit(1, '5');
//     //   // Alice should have 10000 + 5*1/3*1000 = 11666 pending reward
//     //   await advanceBlockTo(430);
//     //   // At block 430. Bob should get 5*2/3*100 = 333. Alice should get ~1666 more.
//     //   await staking.updatePtnPerBlock(0);
//     //   await advanceBlockTo(490);
//     //   await staking.updateMultiplier(0, 0);

//     //   await staking.connect(alice).deposit(0, '0');
//     //   await staking.connect(bob).deposit(1, '0');

//     //   await advanceBlockTo(560);
//     //   expect(await staking.pendingPtn(0, alice.address)).to.equal('0');
//     //   expect(await staking.pendingPtn(1, bob.address)).to.equal('0');
//     // });
//   });
// });
