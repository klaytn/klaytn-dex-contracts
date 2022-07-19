// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "../interfaces/IDexFactory.sol";
import "./DexPair.sol";
import "./Errors.sol";

contract DexFactory is IDexFactory {
    /// @notice the recipient of the protocol-wide charge.
    address public feeTo;
    /// @notice The address allowed to change `feeTo`.
    address public feeToSetter;

    /**
     * @notice Returns the address of the pair for tokenA and tokenB, if it has been created, else address(0).
     * @dev tokenA and tokenB are interchangeable. Pair addresses can also be calculated deterministically.
    */
    mapping(address => mapping(address => address)) public getPair;
    /**
     * @notice Returns the address of the nth pair (0-indexed) created through the factory, or address(0)
      if not enough pairs have been created yet.
     * @dev Pass 0 for the address of the first pair created, 1 for the second, etc.
    */
    address[] public allPairs;
    /// @notice Init codehash used in Dex Library to calculate pair address without any external calls.
    bytes32 public constant INIT =
        keccak256(abi.encodePacked(type(DexPair).creationCode));

    /**
     * @dev Emitted each time a pair is created via `createPair`.
     *
     * token0 is guaranteed to be strictly less than token1 by sort order.
     * The final uint log value will be 1 for the first pair created, 2 for the second, etc.
     *
     */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    /// @notice Returns the total number of pairs created through the factory so far.
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /**
     * @notice Creates a pair for tokenA and tokenB if one doesn't exist already.
     * @dev tokenA and tokenB are interchangeable. Emits `PairCreated` event.
     * @param tokenA Address of the first token.
     * @param tokenB Address of the second token.
     * @return pair Address of the created pair.
     */
    function createPair(address tokenA, address tokenB)
        external
        returns (address pair)
    {
        if (tokenA == tokenB)
            revert InvalidAddressParameters("DEX: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0))
            revert InvalidAddressParameters("DEX: ZERO_ADDRESS");
        if (getPair[token0][token1] != address(0))
            revert InvalidAddressParameters("DEX: PAIR_EXISTS"); // single check is sufficient
        pair = address(
            new DexPair{salt: keccak256(abi.encodePacked(token0, token1))}()
        );
        IDexPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /**
     * @notice Sets the new address of the protocol-wide charge recipient.
     * @dev Can only be called by the `feeToSetter`.
     * @param _feeTo The new address of the charge recipient.
    */
    function setFeeTo(address _feeTo) external {
        if (msg.sender != feeToSetter) revert Unauthorized();
        feeTo = _feeTo;
    }

    /**
     * @notice Sets the address which is allowed to control protocol-wide charge recipients.
     * @dev Can only be called by the previous `feeToSetter`.
     * @param _feeToSetter The new address which would be allowed to set the protocol-wide charge.
    */
    function setFeeToSetter(address _feeToSetter) external {
        if (msg.sender != feeToSetter) revert Unauthorized();
        feeToSetter = _feeToSetter;
    }
}
