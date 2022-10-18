// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@klaytn/contracts/KIP/token/KIP7/KIP7.sol";
import "@klaytn/contracts/access/Ownable.sol";

contract TestToken is KIP7, Ownable {
    constructor(string memory _name, string memory _symbol, uint _totalSupply) 
        KIP7(_name, _symbol)
    {
        _mint(msg.sender, _totalSupply);
    }

     function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }
}
