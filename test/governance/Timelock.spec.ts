import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { constants } from 'ethers';
import { expect } from 'chai';
import { mineBlock, genOperation, genOperationBatch } from '../shared/utilities';
import { Operation, BatchOperation } from '../shared/interfaces';
import { TimelockController } from '../../typechain/governance/TimelockController';
import { Implementation2 } from '../../typechain/mocks/RegressionImplementation.sol/Implementation2';
import { CallReceiverMock } from '../../typechain/mocks/CallReceiverMock';
import { TimelockController__factory } from '../../typechain/factories/governance/TimelockController__factory';
import { Implementation2__factory } from '../../typechain/factories/mocks/RegressionImplementation.sol/Implementation2__factory';
import { CallReceiverMock__factory } from '../../typechain/factories/mocks/CallReceiverMock__factory';

const ZERO_BYTES32 = constants.HashZero;
const MINDELAY = 86400;

let TIMELOCK_ADMIN_ROLE: string;
let PROPOSER_ROLE: string;
let EXECUTOR_ROLE: string;
let TimelockControllerF: TimelockController__factory;
let CallReceiverMockF: CallReceiverMock__factory;
let Implementation2F: Implementation2__factory;
let timelock: TimelockController;
let callreceivermock: CallReceiverMock;
let implementation2: Implementation2;
let admin: SignerWithAddress;
let proposer: SignerWithAddress;
let executor: SignerWithAddress;
let other: SignerWithAddress;

describe('TimelockController', () => {
  before(async () => {
    TimelockControllerF = await ethers.getContractFactory('TimelockController');
    CallReceiverMockF = await ethers.getContractFactory('CallReceiverMock');
    Implementation2F = await ethers.getContractFactory('Implementation2');
    [admin, proposer, executor, other] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Deploy new timelock
    timelock = await TimelockControllerF.deploy(
      MINDELAY,
      MINDELAY + 86400,
      [proposer.address],
      [executor.address],
    );
    TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
    PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    // Mocks
    callreceivermock = await CallReceiverMockF.deploy();
    implementation2 = await Implementation2F.deploy();
  });

  it('initial state', async () => {
    expect(await timelock.hasRole(TIMELOCK_ADMIN_ROLE, admin.address)).to.be.equal(true);
    expect((await timelock.getDelay()).toString())
      .to.be.equal(`${MINDELAY.toString()},${(MINDELAY + 86400).toString()}`);
  });

  describe('methods', () => {
    describe('operation hashing', () => {
      it('hashOperation', async () => {
        const operation : Operation = genOperation(
          '0x29cebefe301c6ce1bb36b58654fea275e1cacc83',
          '0xf94fdd6e21da21d2',
          '0xa3bc5104',
          '0xba41db3be0a9929145cfe480bd0f1f003689104d275ae912099f925df424ef94',
          '0x60d9109846ab510ed75c15f979ae366a8a2ace11d34ba9788c13ac296db50e6e',
        );
        expect(await timelock.hashOperation(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
        )).to.be.equal(operation.id);
      });

      it('hashOperationBatch', async () => {
        const operation : BatchOperation = genOperationBatch(
          Array(8).fill('0x2d5f21620e56531c1d59c2df9b8e95d129571f71'),
          Array(8).fill('0x2b993cfce932ccee'),
          Array(8).fill('0xcf51966b'),
          '0xce8f45069cc71d25f71ba05062de1a3974f9849b004de64a70998bca9d29c2e7',
          '0x8952d74c110f72bfe5accdf828c74d53a7dfb71235dfa8a1e8c75d8576b372ff',
        );
        expect(await timelock.hashOperationBatch(
          operation.targets,
          operation.values,
          operation.datas,
          operation.predecessor,
          operation.salt,
        )).to.be.equal(operation.id);
      });
    });
    describe('simple', () => {
      describe('schedule', () => {
        let operation: Operation;
        beforeEach(async () => {
          operation = genOperation(
            '0x31754f590B97fD975Eb86938f18Cc304E264D2F2',
            0,
            '0x3bf92ccc',
            ZERO_BYTES32,
            '0x025e7b0be353a74631ad648c667493c0e1cd31caa4cc2d3520fdc171ea0cc726',
          );
        });

        it('proposer can schedule', async () => {
          await expect(timelock.connect(proposer).schedule(
            operation.target,
            operation.value,
            operation.data,
            operation.predecessor,
            operation.salt,
            MINDELAY.toString(),
          )).to.emit(timelock, 'CallScheduled')
            .withArgs(
              operation.id,
              0,
              operation.target,
              operation.value,
              operation.data,
              operation.predecessor,
              MINDELAY,
            );
          const bn = await ethers.provider.getBlockNumber();
          const { timestamp } = await ethers.provider.getBlock(bn);
          expect(await timelock.getTimestamp(operation.id))
            .to.be.equal(ethers.BigNumber.from(timestamp).add(MINDELAY));
        });

        it('prevent overwritting active operation', async () => {
          await timelock.connect(proposer).schedule(
            operation.target,
            operation.value,
            operation.data,
            operation.predecessor,
            operation.salt,
            MINDELAY,
          );

          await expect(timelock.connect(proposer).schedule(
            operation.target,
            operation.value,
            operation.data,
            operation.predecessor,
            operation.salt,
            MINDELAY,
          )).to.be.revertedWith('TimelockController: operation already scheduled');
        });

        it('prevent non-proposer from commiting', async () => {
          await expect(
            timelock.schedule(
              operation.target,
              operation.value,
              operation.data,
              operation.predecessor,
              operation.salt,
              MINDELAY,
            ),
          ).to.be.revertedWith(
            `AccessControl: account ${admin.address.toLowerCase()} is missing role ${PROPOSER_ROLE}`,
          );
        });

        it('enforce minimum delay', async () => {
          await expect(
            timelock.connect(proposer).schedule(
              operation.target,
              operation.value,
              operation.data,
              operation.predecessor,
              operation.salt,
              MINDELAY - 1,
            ),
          ).to.be.revertedWith(
            'TimelockController: invalid delay',
          );
        });
      });

      describe('execute', () => {
        let operation: Operation;
        beforeEach(async () => {
          operation = genOperation(
            '0xAe22104DCD970750610E6FE15E623468A98b15f7',
            0,
            '0x13e414de',
            ZERO_BYTES32,
            '0xc1059ed2dc130227aa1d1d539ac94c641306905c020436c636e19e3fab56fc7f',
          );
        });

        it('revert if operation is not scheduled', async () => {
          await expect(
            timelock.connect(executor).execute(
              operation.target,
              operation.value,
              operation.data,
              operation.predecessor,
              operation.salt,
            ),
          ).to.be.revertedWith(
            'TimelockController: operation is not ready',
          );
        });

        describe('with scheduled operation', () => {
          beforeEach(async () => {
            await timelock.connect(proposer).schedule(
              operation.target,
              operation.value,
              operation.data,
              operation.predecessor,
              operation.salt,
              MINDELAY,
            );
          });

          it('revert if execution comes too early 1/2', async () => {
            await expect(
              timelock.connect(executor).execute(
                operation.target,
                operation.value,
                operation.data,
                operation.predecessor,
                operation.salt,
              ),
            ).to.be.revertedWith('TimelockController: operation is not ready');
          });

          it('revert if execution comes too early 2/2', async () => {
            const timestamp = await timelock.getTimestamp(operation.id);
            await mineBlock(timestamp.toNumber() - 5); // -1 is too tight, test sometime fails

            await expect(
              timelock.connect(executor).execute(
                operation.target,
                operation.value,
                operation.data,
                operation.predecessor,
                operation.salt,
              ),
            ).to.be.revertedWith(
              'TimelockController: operation is not ready',
            );
          });

          describe('on time', () => {
            beforeEach(async () => {
              const timestamP = await timelock.getTimestamp(operation.id);
              await mineBlock(timestamP.toNumber());
            });

            it('executor can reveal', async () => {
              await expect(timelock.connect(executor).execute(
                operation.target,
                operation.value,
                operation.data,
                operation.predecessor,
                operation.salt,
              )).to.emit(timelock, 'CallExecuted')
                .withArgs(
                  operation.id,
                  0,
                  operation.target,
                  operation.value,
                  operation.data,
                );
            });

            it('prevent non-executor from revealing', async () => {
              await expect(
                timelock.connect(other).execute(
                  operation.target,
                  operation.value,
                  operation.data,
                  operation.predecessor,
                  operation.salt,
                ),
              ).to.be.revertedWith(
                `AccessControl: account ${other.address.toLowerCase()} is missing role ${EXECUTOR_ROLE}`,
              );
            });
          });
        });
      });
    });

    describe('batch', () => {
      describe('schedule', () => {
        let operation: BatchOperation;
        beforeEach(async () => {
          operation = genOperationBatch(
            Array(8).fill('0xEd912250835c812D4516BBD80BdaEA1bB63a293C'),
            Array(8).fill(0),
            Array(8).fill('0x2fcb7a88'),
            ZERO_BYTES32,
            '0x6cf9d042ade5de78bed9ffd075eb4b2a4f6b1736932c2dc8af517d6e066f51f5',
          );
        });

        it('proposer can schedule', async () => {
          await timelock.connect(proposer).scheduleBatch(
            operation.targets,
            operation.values,
            operation.datas,
            operation.predecessor,
            operation.salt,
            MINDELAY,
          );

          const bn = await ethers.provider.getBlockNumber();
          const { timestamp } = await ethers.provider.getBlock(bn);

          expect(await timelock.getTimestamp(operation.id))
            .to.be.equal(ethers.BigNumber.from(timestamp).add(MINDELAY));
        });

        it('prevent overwritting active operation', async () => {
          await timelock.connect(proposer).scheduleBatch(
            operation.targets,
            operation.values,
            operation.datas,
            operation.predecessor,
            operation.salt,
            MINDELAY,
          );

          await expect(
            timelock.connect(proposer).scheduleBatch(
              operation.targets,
              operation.values,
              operation.datas,
              operation.predecessor,
              operation.salt,
              MINDELAY,
            ),
          ).to.be.revertedWith(
            'TimelockController: operation already scheduled',
          );
        });

        it('length of batch parameter must match #1', async () => {
          await expect(
            timelock.connect(proposer).scheduleBatch(
              operation.targets,
              [],
              operation.datas,
              operation.predecessor,
              operation.salt,
              MINDELAY,
            ),
          ).to.be.revertedWith(
            'TimelockController: length mismatch',
          );
        });

        it('length of batch parameter must match #1', async () => {
          await expect(
            timelock.connect(proposer).scheduleBatch(
              operation.targets,
              operation.values,
              [],
              operation.predecessor,
              operation.salt,
              MINDELAY,
            ),
          ).to.be.revertedWith('TimelockController: length mismatch');
        });

        it('prevent non-proposer from commiting', async () => {
          await expect(
            timelock.connect(other).scheduleBatch(
              operation.targets,
              operation.values,
              operation.datas,
              operation.predecessor,
              operation.salt,
              MINDELAY,
            ),
          ).to.be.revertedWith(
            `AccessControl: account ${other.address.toLowerCase()} is missing role ${PROPOSER_ROLE}`,
          );
        });

        it('enforce minimum delay', async () => {
          await expect(
            timelock.connect(proposer).scheduleBatch(
              operation.targets,
              operation.values,
              operation.datas,
              operation.predecessor,
              operation.salt,
              MINDELAY - 1,
            ),
          ).to.be.revertedWith(
            'TimelockController: invalid delay',
          );
        });
      });

      describe('execute', () => {
        let operation: BatchOperation;
        beforeEach(async () => {
          operation = genOperationBatch(
            Array(8).fill('0x76E53CcEb05131Ef5248553bEBDb8F70536830b1'),
            Array(8).fill(0),
            Array(8).fill('0x58a60f63'),
            ZERO_BYTES32,
            '0x9545eeabc7a7586689191f78a5532443698538e54211b5bd4d7dc0fc0102b5c7',
          );
        });

        it('revert if operation is not scheduled', async () => {
          await expect(
            timelock.connect(executor).executeBatch(
              operation.targets,
              operation.values,
              operation.datas,
              operation.predecessor,
              operation.salt,
            ),
          ).to.be.revertedWith(
            'TimelockController: operation is not ready',
          );
        });

        describe('with scheduled operation', () => {
          beforeEach(async () => {
            await timelock.connect(proposer).scheduleBatch(
              operation.targets,
              operation.values,
              operation.datas,
              operation.predecessor,
              operation.salt,
              MINDELAY,
            );
          });

          it('revert if execution comes too early 1/2', async () => {
            await expect(
              timelock.connect(executor).executeBatch(
                operation.targets,
                operation.values,
                operation.datas,
                operation.predecessor,
                operation.salt,
              ),
            ).to.be.revertedWith(
              'TimelockController: operation is not ready',
            );
          });

          it('revert if execution comes too early 2/2', async () => {
            const timestamp = await timelock.getTimestamp(operation.id);
            const tp = ethers.BigNumber.from(timestamp).toNumber();
            await mineBlock(tp - 5); // -1 is to tight, test sometime fails

            await expect(
              timelock.connect(executor).executeBatch(
                operation.targets,
                operation.values,
                operation.datas,
                operation.predecessor,
                operation.salt,
              ),
            ).to.be.revertedWith(
              'TimelockController: operation is not ready',
            );
          });

          describe('on time', () => {
            beforeEach(async () => {
              const timestamp = await timelock.getTimestamp(operation.id);
              const tp = ethers.BigNumber.from(timestamp).toNumber();
              await mineBlock(tp);
            });

            it('executor can reveal', async () => {
              await timelock.connect(executor).executeBatch(
                operation.targets,
                operation.values,
                operation.datas,
                operation.predecessor,
                operation.salt,
              );
            });

            it('prevent non-executor from revealing', async () => {
              await expect(
                timelock.connect(other).executeBatch(
                  operation.targets,
                  operation.values,
                  operation.datas,
                  operation.predecessor,
                  operation.salt,
                ),
              ).to.be.revertedWith(
                `AccessControl: account ${other.address.toLowerCase()} is missing role ${EXECUTOR_ROLE}`,
              );
            });

            it('length mismatch #1', async () => {
              await expect(
                timelock.connect(executor).executeBatch(
                  [],
                  operation.values,
                  operation.datas,
                  operation.predecessor,
                  operation.salt,
                ),
              ).to.be.revertedWith(
                'TimelockController: length mismatch',
              );
            });

            it('length mismatch #2', async () => {
              await expect(
                timelock.connect(executor).executeBatch(
                  operation.targets,
                  [],
                  operation.datas,
                  operation.predecessor,
                  operation.salt,
                ),
              ).to.be.revertedWith(
                'TimelockController: length mismatch',
              );
            });

            it('length mismatch #3', async () => {
              await expect(
                timelock.connect(executor).executeBatch(
                  operation.targets,
                  operation.values,
                  [],
                  operation.predecessor,
                  operation.salt,
                ),
              ).to.be.revertedWith(
                'TimelockController: length mismatch',
              );
            });
          });
        });

        it('partial execution', async () => {
          operation = genOperationBatch(
            [
              callreceivermock.address,
              callreceivermock.address,
              callreceivermock.address,
            ],
            [
              0,
              0,
              0,
            ],
            [
              callreceivermock.interface.encodeFunctionData('mockFunction'),
              callreceivermock.interface.encodeFunctionData('mockFunctionThrows'),
              callreceivermock.interface.encodeFunctionData('mockFunction'),
            ],
            ZERO_BYTES32,
            '0x8ac04aa0d6d66b8812fb41d39638d37af0a9ab11da507afd65c509f8ed079d3e',
          );

          await timelock.connect(proposer).scheduleBatch(
            operation.targets,
            operation.values,
            operation.datas,
            operation.predecessor,
            operation.salt,
            MINDELAY,
          );
          const bn = await ethers.provider.getBlockNumber();
          let { timestamp } = await ethers.provider.getBlock(bn);
          timestamp = ethers.BigNumber.from(timestamp).toNumber();
          await mineBlock(MINDELAY + timestamp);
          await expect(
            timelock.connect(executor).executeBatch(
              operation.targets,
              operation.values,
              operation.datas,
              operation.predecessor,
              operation.salt,
            ),
          ).to.be.revertedWith(
            'TimelockController: underlying transaction reverted',
          );
        });
      });
    });

    describe('cancel', () => {
      let operation: Operation;
      beforeEach(async () => {
        operation = genOperation(
          '0xC6837c44AA376dbe1d2709F13879E040CAb653ca',
          0,
          '0x296e58dd',
          ZERO_BYTES32,
          '0xa2485763600634800df9fc9646fb2c112cf98649c55f63dd1d9c7d13a64399d9',
        );
        await timelock.connect(proposer).schedule(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
          MINDELAY,
        );
      });

      it('proposer can cancel', async () => {
        await expect(timelock.connect(proposer).cancel(operation.id))
          .to.emit(timelock, 'Cancelled')
          .withArgs(operation.id);
      });

      it('cannot cancel invalid operation', async () => {
        await expect(
          timelock.connect(proposer).cancel(ZERO_BYTES32),
        )
          .to.be.revertedWith(
            'TimelockController: operation cannot be cancelled',
          );
      });

      it('prevent non-proposer from canceling', async () => {
        await expect(
          timelock.connect(other).cancel(operation.id),
        )
          .to.be.revertedWith(
            `AccessControl: account ${other.address.toLowerCase()} is missing role ${PROPOSER_ROLE}`,
          );
      });
    });
  });

  describe('maintenance', () => {
    it('prevent unauthorized maintenance', async () => {
      await expect(
        timelock.connect(other).updateDelay(0, 0),
      ).to.be.revertedWith(
        'TimelockController: caller must be timelock',
      );
    });

    it('timelock scheduled maintenance', async () => {
      const newDelay = 60 * 60 * 6;
      const operation: Operation = genOperation(
        timelock.address,
        0,
        timelock.interface.encodeFunctionData('updateDelay', [newDelay.toString(), newDelay + 86400]),
        ZERO_BYTES32,
        '0xf8e775b2c5f4d66fb5c7fa800f35ef518c262b6014b3c0aee6ea21bff157f108',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );
      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);
      await expect(timelock.connect(executor).execute(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
      )).to.emit(timelock, 'DelayChange')
        .withArgs(
          MINDELAY,
          newDelay.toString(),
          MINDELAY + 86400,
          newDelay + 86400,
        );

      expect((await timelock.getDelay()).toString())
        .to.be.equal(`${newDelay},${newDelay + 86400}`);
    });
  });

  describe('dependency', () => {
    let operation1: Operation;
    let operation2: Operation;
    beforeEach(async () => {
      operation1 = genOperation(
        '0xdE66bD4c97304200A95aE0AadA32d6d01A867E39',
        0,
        '0x01dc731a',
        ZERO_BYTES32,
        '0x64e932133c7677402ead2926f86205e2ca4686aebecf5a8077627092b9bb2feb',
      );
      operation2 = genOperation(
        '0x3c7944a3F1ee7fc8c5A5134ba7c79D11c3A1FCa3',
        0,
        '0x8f531849',
        operation1.id,
        '0x036e1311cac523f9548e6461e29fb1f8f9196b91910a41711ea22f5de48df07d',
      );
      await timelock.connect(proposer).schedule(
        operation1.target,
        operation1.value,
        operation1.data,
        operation1.predecessor,
        operation1.salt,
        MINDELAY,
      );
      await timelock.connect(proposer).schedule(
        operation2.target,
        operation2.value,
        operation2.data,
        operation2.predecessor,
        operation2.salt,
        MINDELAY,
      );
      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);
    });

    it('cannot execute before dependency', async () => {
      await expect(
        timelock.connect(executor).execute(
          operation2.target,
          operation2.value,
          operation2.data,
          operation2.predecessor,
          operation2.salt,
        ),
      ).to.be.revertedWith(
        'TimelockController: missing dependency',
      );
    });

    it('can execute after dependency', async () => {
      await timelock.connect(executor).execute(
        operation1.target,
        operation1.value,
        operation1.data,
        operation1.predecessor,
        operation1.salt,
      );
      await timelock.connect(executor).execute(
        operation2.target,
        operation2.value,
        operation2.data,
        operation2.predecessor,
        operation2.salt,
      );
    });
  });

  describe('usage scenario', () => {
    setTimeout(() => {}, 10000);

    it('call', async () => {
      const operation: Operation = genOperation(
        implementation2.address,
        0,
        implementation2.interface.encodeFunctionData('setValue', [42]),
        ZERO_BYTES32,
        '0x8043596363daefc89977b25f9d9b4d06c3910959ef0c4d213557a903e1b555e2',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );
      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      await timelock.connect(executor).execute(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
      );

      expect(await implementation2.getValue())
        .to.be.equal(ethers.BigNumber.from(42));
    });

    it('call reverting', async () => {
      const operation: Operation = genOperation(
        callreceivermock.address,
        0,
        callreceivermock.interface.encodeFunctionData('mockFunctionRevertsNoReason'),
        ZERO_BYTES32,
        '0xb1b1b276fdf1a28d1e00537ea73b04d56639128b08063c1a2f70a52e38cba693',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );

      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      await expect(
        timelock.connect(executor).execute(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
        ),
      ).to.be.revertedWith(
        'TimelockController: underlying transaction reverted',
      );
    });

    it('call throw', async () => {
      const operation: Operation = genOperation(
        callreceivermock.address,
        0,
        callreceivermock.interface.encodeFunctionData('mockFunctionThrows'),
        ZERO_BYTES32,
        '0xe5ca79f295fc8327ee8a765fe19afb58f4a0cbc5053642bfdd7e73bc68e0fc67',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );

      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      await expect(
        timelock.connect(executor).execute(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
        ),
      ).to.be.revertedWith(
        'TimelockController: underlying transaction reverted',
      );
    });

    it('call out of gas', async () => {
      const operation: Operation = genOperation(
        callreceivermock.address,
        0,
        callreceivermock.interface.encodeFunctionData('mockFunctionOutOfGas'),
        ZERO_BYTES32,
        '0xf3274ce7c394c5b629d5215723563a744b817e1730cca5587c567099a14578fd',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );

      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      await expect(
        timelock.connect(executor).execute(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
          { gasLimit: '70000' },
        ),
      ).to.be.revertedWith(
        'TimelockController: underlying transaction reverted',
      );
    });

    it('call payable with eth', async () => {
      const operation: Operation = genOperation(
        callreceivermock.address,
        1,
        callreceivermock.interface.encodeFunctionData('mockFunction'),
        ZERO_BYTES32,
        '0x5ab73cd33477dcd36c1e05e28362719d0ed59a7b9ff14939de63a43073dc1f44',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );

      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      expect(await ethers.provider.getBalance(timelock.address))
        .to.be.equal(ethers.BigNumber.from(0));
      expect(await ethers.provider.getBalance(callreceivermock.address))
        .to.be.equal(ethers.BigNumber.from(0));

      await timelock.connect(executor).execute(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        { value: 1 },
      );

      expect(await ethers.provider.getBalance(timelock.address))
        .to.be.equal(ethers.BigNumber.from(0));
      expect(await ethers.provider.getBalance(callreceivermock.address))
        .to.be.equal(ethers.BigNumber.from(1));
    });

    it('call nonpayable with eth', async () => {
      const operation: Operation = genOperation(
        callreceivermock.address,
        1,
        callreceivermock.interface.encodeFunctionData('mockFunctionNonPayable'),
        ZERO_BYTES32,
        '0xb78edbd920c7867f187e5aa6294ae5a656cfbf0dea1ccdca3751b740d0f2bdf8',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );

      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      expect(await ethers.provider.getBalance(timelock.address))
        .to.be.equal(ethers.BigNumber.from(0));
      expect(await ethers.provider.getBalance(callreceivermock.address))
        .to.be.equal(ethers.BigNumber.from(0));

      await expect(
        timelock.connect(executor).execute(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
        ),
      ).to.be.revertedWith(
        'TimelockController: underlying transaction reverted',
      );

      expect(await ethers.provider.getBalance(timelock.address))
        .to.be.equal(ethers.BigNumber.from(0));
      expect(await ethers.provider.getBalance(callreceivermock.address))
        .to.be.equal(ethers.BigNumber.from(0));
    });

    it('call reverting with eth', async () => {
      const operation: Operation = genOperation(
        callreceivermock.address,
        1,
        callreceivermock.interface.encodeFunctionData('mockFunctionRevertsNoReason'),
        ZERO_BYTES32,
        '0xdedb4563ef0095db01d81d3f2decf57cf83e4a72aa792af14c43a792b56f4de6',
      );

      await timelock.connect(proposer).schedule(
        operation.target,
        operation.value,
        operation.data,
        operation.predecessor,
        operation.salt,
        MINDELAY,
      );

      const bn = await ethers.provider.getBlockNumber();
      let { timestamp } = await ethers.provider.getBlock(bn);
      timestamp = ethers.BigNumber.from(timestamp).toNumber();
      await mineBlock(MINDELAY + timestamp);

      expect(await ethers.provider.getBalance(timelock.address))
        .to.be.equal(ethers.BigNumber.from(0));
      expect(await ethers.provider.getBalance(callreceivermock.address))
        .to.be.equal(ethers.BigNumber.from(0));

      await expect(
        timelock.connect(executor).execute(
          operation.target,
          operation.value,
          operation.data,
          operation.predecessor,
          operation.salt,
        ),
      ).to.be.revertedWith(
        'TimelockController: underlying transaction reverted',
      );

      expect(await ethers.provider.getBalance(timelock.address))
        .to.be.equal(ethers.BigNumber.from(0));
      expect(await ethers.provider.getBalance(callreceivermock.address))
        .to.be.equal(ethers.BigNumber.from(0));
    });
  });
});
