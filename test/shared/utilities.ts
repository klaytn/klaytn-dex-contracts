import { Contract, BigNumber } from 'ethers';
import {
  keccak256, solidityPack, getAddress,
} from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

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

export function getDomainSeparator(
  name: string,
  version: string,
  chainId: number,
  verifyingContract: string,
): string {
  // eslint-disable-next-line no-underscore-dangle
  const separator = ethers.utils._TypedDataEncoder.hashDomain({
    name,
    version,
    chainId,
    verifyingContract,
  });
  return separator;
}

export async function getPermitSignature(
  wallet: SignerWithAddress,
  token: Contract,
  chainId: number,
  Permit: {
    owner: string
    spender: string
    value: BigNumber
    nonce: BigNumber,
    deadline: BigNumber,
  },
): Promise<string> {
  const name = await token.name();
  // eslint-disable-next-line no-underscore-dangle
  const signature = await wallet._signTypedData(
    {
      name,
      version: '1',
      chainId,
      verifyingContract: token.address,
    },
    {
      Permit: [
        {
          name: 'owner',
          type: 'address',
        },
        {
          name: 'spender',
          type: 'address',
        },
        {
          name: 'value',
          type: 'uint256',
        },
        {
          name: 'nonce',
          type: 'uint256',
        },
        {
          name: 'deadline',
          type: 'uint256',
        },
      ],
    },
    {
      owner: Permit.owner,
      spender: Permit.spender,
      value: Permit.value,
      nonce: Permit.nonce,
      deadline: Permit.deadline,
    },
  );
  return signature;
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
