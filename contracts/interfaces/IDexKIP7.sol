// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IKIP13.sol';
import './IKIP7Metadata.sol';

interface IDexKIP7 is IKIP7Metadata, IKIP13{

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

}
