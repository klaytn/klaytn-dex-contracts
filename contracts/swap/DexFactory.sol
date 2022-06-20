// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "../interfaces/IDexFactory.sol";
import "./DexPair.sol";
import "./Errors.sol";

contract DexFactory is IDexFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    bytes32 public constant INIT = keccak256(abi.encodePacked(type(DexPair).creationCode));

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB)
        external
        returns (address pair)
    {
        if (tokenA == tokenB)
            revert InvalidAddressParameters('DEX: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0))
            revert InvalidAddressParameters('DEX: ZERO_ADDRESS');
        if (getPair[token0][token1] != address(0))
            revert InvalidAddressParameters('DEX: PAIR_EXISTS'); // single check is sufficient
        pair = address(
            new DexPair{
                salt: keccak256(abi.encodePacked(token0, token1))
            }()
        );
        IDexPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        if (msg.sender != feeToSetter) revert Unauthorized();
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        if (msg.sender != feeToSetter) revert Unauthorized();
        feeToSetter = _feeToSetter;
    }
}
