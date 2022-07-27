// SPDX-License-Identifier: MIT

import './IDexKIP7.sol';
pragma solidity ^0.8.0;

interface IDexPair is IDexKIP7 {

    /// @dev Emitted each time liquidity tokens are created via `mint` function.
    event Mint(address indexed sender, uint amount0, uint amount1);
    /// @dev Emitted each time liquidity tokens are destroyed via `burn` function.
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    /// @dev Emitted each time a swap occurs via `swap` operation.
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    /// Emitted each time reserves are updated via `mint`, `burn`, `swap`, or `sync` functions.
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);

    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function skim(address to) external;
    function sync() external;

    function initialize(address, address) external;
}
