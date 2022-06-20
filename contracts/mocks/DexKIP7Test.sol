// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import '../swap/DexKIP7.sol';

contract DexKIP7Test is DexKIP7 {
    constructor(uint _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}