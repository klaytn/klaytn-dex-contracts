// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@klaytn/contracts/KIP/token/KIP7/KIP7.sol";

contract KIP7Mock is KIP7 {
    constructor(uint _totalSupply) KIP7('TestToken','TST'){
        _mint(msg.sender, _totalSupply);
    }
}
