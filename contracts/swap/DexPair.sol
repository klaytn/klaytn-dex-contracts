// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "../interfaces/IDexPair.sol";
import "./DexKIP7.sol";
import "../libraries/Math.sol";
import "../libraries/UQ112x112.sol";
import "@klaytn/contracts/KIP/interfaces/IKIP7.sol";
import "../interfaces/IDexFactory.sol";
import "../interfaces/IDexCallee.sol";
import "./Errors.sol";

contract DexPair is IDexPair, DexKIP7 {
    using UQ112x112 for uint224;

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    /// @notice Returns the factory address.
    address public immutable factory;
    /// @notice Returns the address of the pair token with the lower sort order.
    address public token0;
    /// @notice Returns the address of the pair token with the higher sort order.
    address public token1;

    uint112 private reserve0; // uses single storage slot, accessible via getReserves
    uint112 private reserve1; // uses single storage slot, accessible via getReserves
    uint32 private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    /// @notice Returns the product of the reserves as of the most recent liquidity event.
    uint256 public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint256 private unlocked = 1;
    modifier lock() {
        if(unlocked != 1) revert Locked();
        unlocked = 0;
        _;
        unlocked = 1;
    }
    /** 
    * @notice Returns the reserves of token0 and token1 used to price 
    * trades and distribute liquidity. Also returns the block.timestamp (mod 2**32) 
    * of the last block during which an interaction occured for the pair.
    */
    function getReserves()
        public
        view
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
    * @notice Transfers tokens from msg.sender to a recipient
    * @dev Calls transfer on token contract via low-level call by transfer function selector (0xa9059cbb) 
    * @param token The contract address of the token which will be transferred
    * @param to The address of the recipient
    * @param value The amount of tokens to be transferred
    */
    function _safeTransfer(
        address token,
        address to,
        uint256 value
    ) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "DEX: TRANSFER_FAILED");
    }

    constructor() {
        factory = msg.sender;
    }

    /** 
    * @dev called once by the factory at time of deployment. 
    * Initializes pair contract with corresponding tokens
    * @param _token0 Address of the token with the lower sort order.
    * @param _token1 Address of the token with the higher sort order.
    */
    function initialize(address _token0, address _token1) external {
        if (msg.sender != factory) revert Unauthorized(); // sufficient check
        token0 = _token0;
        token1 = _token1;
    }

    /** 
    * @dev update reserves and, on the first call per block, price accumulators
    * @param balance0 Current balance of token0 in the pair calculated via balanceOf.
    * @param balance1 Current balance of token1 in the pair calculated via balanceOf.
    * @param _reserve0 Current reserve of token0 in the pair.
    * @param _reserve1 Current reserve of token1 in the pair.
    */
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert Overflow();
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        unchecked {
            uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
            if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
                // * never overflows, and + overflow is desired
                price0CumulativeLast += uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
                price1CumulativeLast += uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
            }
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    /// @dev if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IDexFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast; // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = Math.sqrt(uint256(_reserve0) * _reserve1);
                uint256 rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply * (rootK - rootKLast);
                    uint256 denominator = rootK * 5 + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    /** 
    * @notice Creates pool LP tokens.
    * Emits `Mint`, `Sync`, `Transfer` events.
    * @dev this low-level function should be called from a contract which performs important safety checks
    * @param to Address of LP tokens recipient.
    */ 
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
        uint256 balance0 = IKIP7(token0).balanceOf(address(this));
        uint256 balance1 = IKIP7(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }
        if(liquidity == 0) revert InsufficientLiquidity("DEX: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * reserve1; // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    /** 
    * @notice Destroys pool LP tokens.
    * Emits `Burn`, `Sync`, `Transfer` events.
    * @dev this low-level function should be called from a contract which performs important safety checks
    * @param to token0 and token1 recipient address after LP tokens are destroyed
    */ 
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        uint256 balance0 = IKIP7(_token0).balanceOf(address(this));
        uint256 balance1 = IKIP7(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = (liquidity * balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = (liquidity * balance1) / _totalSupply; // using balances ensures pro-rata distribution
        if(amount0 == 0 || amount1 == 0) revert InsufficientLiquidity("DEX: INSUFFICIENT_LIQUIDITY_BURNED");
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IKIP7(_token0).balanceOf(address(this));
        balance1 = IKIP7(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * reserve1; // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /** 
    * @notice Swaps tokens. For regular swaps, data.length must be 0.
    * @dev this low-level function should be called from a contract which performs important safety checks
    * Emits Swap, Sync events.
    * @param amount0Out Amount of token0 to be sent to the `to` recipient.
    * @param amount1Out Amount of token1 to be sent to the `to` recipient.
    * @param to Address of tokens recipient. If data.length is greater than 0, the contract transfers the 
    * tokens and then calls the `uniswapV2Call` callback function on the `to` address
    * @param data Arbitary length data to be passed to the `uniswapV2Call` callback function. Used in case 
    * of flash swap.
    */ 
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external lock {
        if(amount0Out == 0 && amount1Out == 0) revert InsufficientAmount("DEX: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
        if(amount0Out >= _reserve0 || amount1Out >= _reserve1) revert InsufficientLiquidity("DEX: INSUFFICIENT_LIQUIDITY");

        uint256 balance0;
        uint256 balance1;
        {
            // scope for _token{0,1}, avoids stack too deep errors
            address _token0 = token0;
            address _token1 = token1;
            if(to == _token0 || to == _token1) revert InvalidAddressParameters("DEX: INVALID_TO");
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
            if (data.length > 0) IDexCallee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            balance0 = IKIP7(_token0).balanceOf(address(this));
            balance1 = IKIP7(_token1).balanceOf(address(this));
        }
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        if(amount0In == 0 && amount1In == 0) revert InsufficientAmount("DEX: INSUFFICIENT_INPUT_AMOUNT");
        {
            // scope for reserve{0,1}Adjusted, avoids stack too deep errors
            uint256 balance0Adjusted = balance0 * 1000 - (amount0In * 3);
            uint256 balance1Adjusted = balance1 * 1000 - (amount1In * 3);
            if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * _reserve1 * (1000**2)) 
                revert InsufficientAmount("DEX: K");
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /** 
    * @notice force balances to match reserves
    * @dev skim() functions as a recovery mechanism in case enough tokens are sent to an pair to
    * overflow the two uint112 storage slots for reserves, which could otherwise cause trades to
    * fail. skim() allows a user to withdraw the difference between the current balance of the
    * pair and 2112 − 1 to the caller, if that difference is greater than 0.
    */ 
    function skim(address to) external lock {
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        _safeTransfer(_token0, to, IKIP7(_token0).balanceOf(address(this)) - reserve0);
        _safeTransfer(_token1, to, IKIP7(_token1).balanceOf(address(this)) - reserve1);
    }

    /**
    * @notice force reserves to match balances
    * @dev sync() functions as a recovery mechanism in the case that a token asynchronously
    * deflates the balance of a pair. In this case, trades will receive sub-optimal rates, and if no
    * liquidity provider is willing to rectify the situation, the pair is stuck. sync() exists to set
    * the reserves of the contract to the current balances, providing a somewhat graceful recovery
    * from this situation.
    */
    function sync() external lock {
        _update(IKIP7(token0).balanceOf(address(this)), IKIP7(token1).balanceOf(address(this)), reserve0, reserve1);
    }
}
