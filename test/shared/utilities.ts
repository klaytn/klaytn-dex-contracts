import { Contract, BigNumber } from 'ethers';
import {
  keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack, getAddress,
} from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { Operation, BatchOperation } from './interfaces';

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'),
);

export function getDomainSeparator(name: string, tokenAddress: string, chainId: number) : string {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes('1')),
        chainId,
        tokenAddress,
      ],
    ),
  );
}

export function getCreate2Address(
  factoryAddress: string,
  [tokenA, tokenB]: [string, string],
  bytecode: string,
): string {
  const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
  const create2Inputs = [
    '0xff',
    factoryAddress,
    keccak256(solidityPack(['address', 'address'], [token0, token1])),
    keccak256(bytecode),
  ];
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`;
  return getAddress(`0x${keccak256(sanitizedInputs).slice(-40)}`);
}

export async function getApprovalDigest(
  token: Contract,
  approve: {
    owner: string
    spender: string
    value: any
  },
  nonce: number,
  deadline: any,
  chainId: number,
): Promise<string> {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, chainId);
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline],
          ),
        ),
      ],
    ),
  );
}

export async function mineBlock(timestamp: number): Promise<void> {
  // eslint-disable-next-line no-async-promise-executor
  await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
  await ethers.provider.send('evm_mine', []);
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber) : BigNumber[] {
  return [
    reserve1.mul(BigNumber.from('2').pow(112)).div(reserve0),
    reserve0.mul(BigNumber.from('2').pow(112)).div(reserve1),
  ];
}

export function genOperation(
  target: string,
  value: string | number,
  data: string,
  predecessor: string,
  salt: string,
) : Operation {
  const id = ethers.utils.keccak256(defaultAbiCoder.encode([
    'address',
    'uint256',
    'bytes',
    'uint256',
    'bytes32',
  ], [
    target,
    value,
    data,
    predecessor,
    salt,
  ]));
  return {
    id, target, value, data, predecessor, salt,
  };
}

export function genOperationBatch(
  targets: string[],
  values: string[] | number[],
  datas: string[],
  predecessor: string,
  salt: string,
) : BatchOperation {
  const id = ethers.utils.keccak256(defaultAbiCoder.encode([
    'address[]',
    'uint256[]',
    'bytes[]',
    'uint256',
    'bytes32',
  ], [
    targets,
    values,
    datas,
    predecessor,
    salt,
  ]));
  return {
    id, targets, values, datas, predecessor, salt,
  };
}
