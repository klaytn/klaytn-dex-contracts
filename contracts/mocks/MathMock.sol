// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.12;
import "../libraries/Math.sol";

contract MathMock{
    function min(uint a, uint b) public pure returns (uint) {
        return Math.min(a, b);
    }
    function sqrt(uint a) public pure returns (uint) {
        return Math.sqrt(a);
    }
}
