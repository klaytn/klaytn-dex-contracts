// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "../libraries/DexLibrary.sol";
import "../libraries/TransferHelper.sol";
import "../interfaces/IDexRouter.sol";
import "../interfaces/IDexFactory.sol";
import "@klaytn/contracts/KIP/interfaces/IKIP7.sol";
import "../interfaces/IWKLAY.sol";
import "./Errors.sol";

contract DexRouter is IDexRouter {
    ///@dev Returns factory address.
    address public immutable override factory;
    ///@dev Returns the WKLAY address
    address public immutable override WKLAY;

    modifier ensure(uint256 deadline) {
        if (deadline < block.timestamp) revert Expired();
        _;
    }

    constructor(address _factory, address _WKLAY) {
        if(_factory == address(0)) revert InvalidAddressParameters("DexRouter: FACTORY_ZERO_ADDRESS");
        if(_WKLAY == address(0)) revert InvalidAddressParameters("DexRouter: WKLAY_ZERO_ADDRESS");
        factory = _factory;
        WKLAY = _WKLAY;
    }

    receive() external payable {
        assert(msg.sender == WKLAY); // only accept KLAY via fallback from the WKLAY contract
    }

    // **** ADD LIQUIDITY ****
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal virtual returns (uint256 amountA, uint256 amountB) {
        // create the pair if it doesn't exist yet
        if (IDexFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IDexFactory(factory).createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = DexLibrary.getReserves(
            factory,
            tokenA,
            tokenB
        );
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = DexLibrary.quote(
                amountADesired,
                reserveA,
                reserveB
            );
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin)
                    revert InsufficientAmount(
                        "DexRouter: INSUFFICIENT_B_AMOUNT"
                    );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = DexLibrary.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                assert(amountAOptimal <= amountADesired);
                if (amountAOptimal < amountAMin)
                    revert InsufficientAmount(
                        "DexRouter: INSUFFICIENT_A_AMOUNT"
                    );
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    /**
     * @notice  Adds liquidity to an ERC20⇄ERC20/KIP7⇄KIP7/ERC20⇄KIP7 pool.
     * @dev To cover all possible scenarios, msg.sender should have already given the
     * router an allowance of at least amountADesired/amountBDesired on tokenA/tokenB.
     * Always adds assets at the ideal ratio, according to the price when the transaction
     * is executed.
     * If a pool for the passed tokens does not exists, one is created automatically,
     * and exactly amountADesired/amountBDesired tokens are added.
     * @param tokenA A pool token.
     * @param tokenB A pool token.
     * @param amountADesired The amount of tokenA to add as liquidity if the B/A price
     * is <= amountBDesired/amountADesired (A depreciates).
     * @param amountBDesired The amount of tokenB to add as liquidity if the A/B price
     * is <= amountADesired/amountBDesired (B depreciates).
     * @param amountAMin Bounds the extent to which the B/A price can go up before the
     * transaction reverts. Must be <= amountADesired.
     * @param amountBMin Bounds the extent to which the A/B price can go up before the
     * transaction reverts. Must be <= amountBDesired.
     * @param to Recipient of the liquidity tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amountA The amount of tokenA sent to the pool.
     * @return amountB The amount of tokenB sent to the pool.
     * @return liquidity The amount of liquidity tokens minted.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {   
        if(to == address(0)) revert InvalidAddressParameters("DexRouter: RECIPIENT_ZERO_ADDRESS");
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        address pair = DexLibrary.pairFor(factory, tokenA, tokenB);
        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IDexPair(pair).mint(to);
    }

    /**
     * @notice Adds liquidity to an ERC20⇄WKLAY/KIP7⇄WKLAY pool with KLAY.
     * @dev To cover all possible scenarios, msg.sender should have already given the
     * router an allowance of at least amountTokenDesired on token.
     * Always adds assets at the ideal ratio, according to the price when the transaction is executed.
     * msg.value is treated as a amountKLAYDesired.
     * Leftover KLAY, if any, is returned to msg.sender.
     * If a pool for the passed token and WKLAY does not exists, one is created automatically,
     * and exactly amountTokenDesired/msg.value tokens are added.
     * @param token A pool token.
     * @param amountTokenDesired The amount of token to add as liquidity if the WKLAY/token price
     * is <= msg.value/amountTokenDesired (token depreciates).
     * @param amountTokenMin Bounds the extent to which the WKLAY/token price can go up before the
     * transaction reverts. Must be <= amountTokenDesired.
     * @param amountKLAYMin Bounds the extent to which the token/WKLAY price can go up before the
     * transaction reverts. Must be <= msg.value.
     * @param to Recipient of the liquidity tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amountToken The amount of token sent to the pool.
     * @return amountKLAY The amount of KLAY converted to WKLAY and sent to the pool.
     * @return liquidity The amount of liquidity tokens minted.
     */
    function addLiquidityKLAY(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountKLAYMin,
        address to,
        uint256 deadline
    )
        external
        payable
        virtual
        override
        ensure(deadline)
        returns (
            uint256 amountToken,
            uint256 amountKLAY,
            uint256 liquidity
        )
    {
        if(to == address(0)) revert InvalidAddressParameters("DexRouter: RECIPIENT_ZERO_ADDRESS");
        (amountToken, amountKLAY) = _addLiquidity(
            token,
            WKLAY,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountKLAYMin
        );
        address pair = DexLibrary.pairFor(factory, token, WKLAY);
        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        IWKLAY(WKLAY).deposit{value: amountKLAY}();
        assert(IWKLAY(WKLAY).transfer(pair, amountKLAY));
        liquidity = IDexPair(pair).mint(to);
        // refund dust klay, if any
        if (msg.value > amountKLAY)
            TransferHelper.safeTransferKLAY(msg.sender, msg.value - amountKLAY);
    }

    // **** REMOVE LIQUIDITY ****
    /**
     * @notice Removes liquidity from an ERC20⇄ERC20/KIP7⇄KIP7/ERC20⇄KIP7 pool.
     * @dev To cover all possible scenarios, msg.sender should have already given the
     * router an allowance of at least liquidity on the pool.
     * @param tokenA A pool token.
     * @param tokenB A pool token.
     * @param liquidity The amount of liquidity tokens to remove.
     * @param amountAMin The minimum amount of tokenA that must be received for the transaction not to revert.
     * @param amountBMin The minimum amount of tokenB that must be received for the transaction not to revert.
     * @param to Recipient of the underlying assets.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amountA The amount of tokenA received from the pool.
     * @return amountB The amount of tokenB received from the pool.
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        public
        virtual
        override
        ensure(deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        if(to == address(0)) revert InvalidAddressParameters("DexRouter: RECIPIENT_ZERO_ADDRESS");
        address pair = DexLibrary.pairFor(factory, tokenA, tokenB);
        IDexPair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        (uint256 amount0, uint256 amount1) = IDexPair(pair).burn(to);
        (address token0, ) = DexLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        if (amountA < amountAMin)
            revert InsufficientAmount("DexRouter: INSUFFICIENT_A_AMOUNT");
        if (amountB < amountBMin)
            revert InsufficientAmount("DexRouter: INSUFFICIENT_B_AMOUNT");
    }

    /**
     * @notice Removes liquidity from an ERC20⇄WKLAY/KIP7⇄WKLAY pool and receive KLAY.
     * @dev To cover all possible scenarios, msg.sender should have already given the
     * router an allowance of at least liquidity on the pool.
     * @param token A pool token.
     * @param liquidity The amount of liquidity tokens to remove.
     * @param amountTokenMin The minimum amount of token that must be received for the transaction not to revert.
     * @param amountKLAYMin The minimum amount of KLAY that must be received for the transaction not to revert.
     * @param to Recipient of the underlying assets.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amountToken The amount of token received from the pool.
     * @return amountKLAY The amount of KLAY received from the pool.
     */
    function removeLiquidityKLAY(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountKLAYMin,
        address to,
        uint256 deadline
    )
        public
        virtual
        override
        ensure(deadline)
        returns (uint256 amountToken, uint256 amountKLAY)
    {
        (amountToken, amountKLAY) = removeLiquidity(
            token,
            WKLAY,
            liquidity,
            amountTokenMin,
            amountKLAYMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, amountToken);
        IWKLAY(WKLAY).withdraw(amountKLAY);
        TransferHelper.safeTransferKLAY(to, amountKLAY);
    }
    /**
    * @dev Removes liquidity from an ERC20⇄ERC20/KIP7⇄KIP7/KIP7⇄ERC20 pool without pre-approval. 
    */
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual override returns (uint256 amountA, uint256 amountB) {
        address pair = DexLibrary.pairFor(factory, tokenA, tokenB);
        uint256 value = approveMax ? type(uint256).max : liquidity;
        IDexPair(pair).permit(
            msg.sender,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );
        (amountA, amountB) = removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            deadline
        );
    }
    /**
    * @dev Removes liquidity from an ERC20⇄WKLAY/KIP7⇄WKLAY pool and receive KLAY without pre-approval 
    */
    function removeLiquidityKLAYWithPermit(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountKLAYMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        virtual
        override
        returns (uint256 amountToken, uint256 amountKLAY)
    {
        address pair = DexLibrary.pairFor(factory, token, WKLAY);
        uint256 value = approveMax ? type(uint256).max : liquidity;
        IDexPair(pair).permit(
            msg.sender,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );
        (amountToken, amountKLAY) = removeLiquidityKLAY(
            token,
            liquidity,
            amountTokenMin,
            amountKLAYMin,
            to,
            deadline
        );
    }

    // **** REMOVE LIQUIDITY (supporting fee-on-transfer tokens) ****

    /**
    * @dev Identical to removeLiquidityKLAY, but succeeds for tokens that take a fee on transfer.
    * msg.sender should have already given the router an allowance of at least liquidity on the pool. 
    */
    function removeLiquidityKLAYSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountKLAYMin,
        address to,
        uint256 deadline
    ) public virtual override ensure(deadline) returns (uint256 amountKLAY) {
        (, amountKLAY) = removeLiquidity(
            token,
            WKLAY,
            liquidity,
            amountTokenMin,
            amountKLAYMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(
            token,
            to,
            IKIP7(token).balanceOf(address(this))
        );
        IWKLAY(WKLAY).withdraw(amountKLAY);
        TransferHelper.safeTransferKLAY(to, amountKLAY);
    }

    /**
    * @dev Identical to removeLiquidityKLAYWithPermit, but succeeds for tokens that take a fee on transfer. 
    */
    function removeLiquidityKLAYWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountKLAYMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual override returns (uint256 amountKLAY) {
        address pair = DexLibrary.pairFor(factory, token, WKLAY);
        uint256 value = approveMax ? type(uint256).max : liquidity;
        IDexPair(pair).permit(
            msg.sender,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );
        amountKLAY = removeLiquidityKLAYSupportingFeeOnTransferTokens(
            token,
            liquidity,
            amountTokenMin,
            amountKLAYMin,
            to,
            deadline
        );
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(
        uint256[] memory amounts,
        address[] memory path,
        address _to
    ) internal virtual {
        if(_to == address(0)) revert InvalidAddressParameters("DexRouter: SWAP_TO_ZERO_ADDRESS");
        uint256 length = path.length - 1;
        for (uint256 i = 0; i < length; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = DexLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < length - 1
                ? DexLibrary.pairFor(factory, output, path[i + 2])
                : _to;
            IDexPair(DexLibrary.pairFor(factory, input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }

    /**
     * @notice Swaps an exact amount of input tokens for as many output tokens as possible, along the route determined by
     * the path. The first element of path is the input token, the last is the output token, and any intermediate elements
     * represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @dev msg.sender should have already given the router an allowance of at least amountIn on the input token.
     * @param amountIn The amount of input tokens to send.
     * @param amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must
     * exist and have liquidity.
     * @param to Recipient of the output tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amounts The input token amount and all subsequent output token amounts.
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        amounts = DexLibrary.getAmountsOut(factory, amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin)
            revert InsufficientAmount("DexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    /**
     * @notice Receive an exact amount of output tokens for as few input tokens as possible, along the route determined by
     * the path. The first element of path is the input token, the last is the output token, and any intermediate elements
     * represent intermediate tokens to trade through (if, for example, a direct pair does not exist).
     * @dev msg.sender should have already given the router an allowance of at least amountInMax on the input token.
     * @param amountOut The amount of output tokens to receive.
     * @param amountInMax The maximum amount of input tokens that can be required before the transaction reverts.
     * @param path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must
     * exist and have liquidity.
     * @param to Recipient of the output tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amounts The input token amount and all subsequent output token amounts.
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        amounts = DexLibrary.getAmountsIn(factory, amountOut, path);
        if (amounts[0] > amountInMax) revert ExcessiveInputAmount();
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    /**
     * @notice Swaps an exact amount of KLAY for as many output tokens as possible, along the route determined by
     * the path. The first element of path must be WKLAY, the last is the output token, and any intermediate elements
     * represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @param amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must
     * exist and have liquidity.
     * @param to Recipient of the output tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amounts The input token amount and all subsequent output token amounts.
     */
    function swapExactKLAYForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        payable
        virtual
        override
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        if (path[0] != WKLAY) revert InvalidPath();
        amounts = DexLibrary.getAmountsOut(factory, msg.value, path);
        if (amounts[amounts.length - 1] < amountOutMin)
            revert InsufficientAmount("DexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        IWKLAY(WKLAY).deposit{value: amounts[0]}();
        assert(
            IWKLAY(WKLAY).transfer(
                DexLibrary.pairFor(factory, path[0], path[1]),
                amounts[0]
            )
        );
        _swap(amounts, path, to);
    }

    /**
     * @notice Receive an exact amount of KLAY for as few input tokens as possible, along the route determined by
     * the path. The first element of path is the input token, the last must be WKLAY, and any intermediate elements
     * represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @dev msg.sender should have already given the router an allowance of at least amountInMax on the input token.
     * If the to address is a smart contract, it must have the ability to receive KLAY.
     * @param amountOut The amount of KLAY to receive.
     * @param amountInMax The maximum amount of input tokens that can be required before the transaction reverts.
     * @param path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must
     * exist and have liquidity.
     * @param to Recipient of the output tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amounts The input token amount and all subsequent output token amounts.
     */
    function swapTokensForExactKLAY(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        if (path[path.length - 1] != WKLAY) revert InvalidPath();
        amounts = DexLibrary.getAmountsIn(factory, amountOut, path);
        if (amounts[0] > amountInMax) revert ExcessiveInputAmount();
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, address(this));
        IWKLAY(WKLAY).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferKLAY(to, amounts[amounts.length - 1]);
    }

    /**
     * @notice Swaps an exact amount of tokens for as much KLAY as possible, along the route determined by
     * the path. The first element of path is the input token, the last must be WKLAY, and any intermediate
     * elements represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @dev If the to address is a smart contract, it must have the ability to receive KLAY.
     * @param amountIn The amount of input tokens to send.
     * @param amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must
     * exist and have liquidity.
     * @param to Recipient of the output tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amounts The input token amount and all subsequent output token amounts.
     */
    function swapExactTokensForKLAY(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        if (path[path.length - 1] != WKLAY) revert InvalidPath();
        amounts = DexLibrary.getAmountsOut(factory, amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin)
            revert InsufficientAmount("DexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, address(this));
        IWKLAY(WKLAY).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferKLAY(to, amounts[amounts.length - 1]);
    }

    /**
     * @notice Receive an exact amount of tokens for as little KLAY as possible, along the route determined by
     * the path. The first element of path must be WKLAY, the last is the output token and any intermediate elements
     * represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @dev Leftover KLAY, if any, is returned to msg.sender.
     * @param amountOut The amount of tokens to receive.
     * @param path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must
     * exist and have liquidity.
     * @param to Recipient of the output tokens.
     * @param deadline Unix timestamp after which the transaction will revert.
     * @return amounts The input token amount and all subsequent output token amounts.
     */
    function swapKLAYForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        payable
        virtual
        override
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        if (path[0] != WKLAY) revert InvalidPath();
        amounts = DexLibrary.getAmountsIn(factory, amountOut, path);
        if (amounts[0] > msg.value) revert ExcessiveInputAmount();
        IWKLAY(WKLAY).deposit{value: amounts[0]}();
        assert(
            IWKLAY(WKLAY).transfer(
                DexLibrary.pairFor(factory, path[0], path[1]),
                amounts[0]
            )
        );
        _swap(amounts, path, to);
        // refund dust klay, if any
        if (msg.value > amounts[0])
            TransferHelper.safeTransferKLAY(msg.sender, msg.value - amounts[0]);
    }

    // **** SWAP (supporting fee-on-transfer tokens) ****
    // requires the initial amount to have already been sent to the first pair
    function _swapSupportingFeeOnTransferTokens(
        address[] memory path,
        address _to
    ) internal virtual {
        if(_to == address(0)) revert InvalidAddressParameters("DexRouter: SWAP_TO_ZERO_ADDRESS");
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = DexLibrary.sortTokens(input, output);
            IDexPair pair = IDexPair(
                DexLibrary.pairFor(factory, input, output)
            );
            uint256 amountInput;
            uint256 amountOutput;
            {
                // scope to avoid stack too deep errors
                (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
                (uint256 reserveInput, uint256 reserveOutput) = input == token0
                    ? (reserve0, reserve1)
                    : (reserve1, reserve0);
                amountInput =
                    IKIP7(input).balanceOf(address(pair)) -
                    reserveInput;
                amountOutput = DexLibrary.getAmountOut(
                    amountInput,
                    reserveInput,
                    reserveOutput
                );
            }
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOutput)
                : (amountOutput, uint256(0));
            address to = i < path.length - 2
                ? DexLibrary.pairFor(factory, output, path[i + 2])
                : _to;
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    /**
     * @dev Identical to swapExactTokensForTokens, but succeeds for tokens that take a fee on transfer.
     */
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amountIn
        );
        uint256 balanceBefore = IKIP7(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        if (
            IKIP7(path[path.length - 1]).balanceOf(to) - balanceBefore <
            amountOutMin
        ) revert InsufficientAmount("DexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    }

    /**
     * @dev Identical to swapExactKLAYForTokens, but succeeds for tokens that take a fee on transfer.
     */
    function swapExactKLAYForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        if (path[0] != WKLAY) revert InvalidPath();
        uint256 amountIn = msg.value;
        IWKLAY(WKLAY).deposit{value: amountIn}();
        assert(
            IWKLAY(WKLAY).transfer(
                DexLibrary.pairFor(factory, path[0], path[1]),
                amountIn
            )
        );
        uint256 balanceBefore = IKIP7(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        if (
            IKIP7(path[path.length - 1]).balanceOf(to) - balanceBefore <
            amountOutMin
        ) revert InsufficientAmount("DexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    }

    /**
     * @dev Identical to swapExactTokensForKLAY, but succeeds for tokens that take a fee on transfer.
     * If the to address is a smart contract, it must have the ability to receive KLAY.
     */
    function swapExactTokensForKLAYSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        if (path[path.length - 1] != WKLAY) revert InvalidPath();
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amountIn
        );
        _swapSupportingFeeOnTransferTokens(path, address(this));
        uint256 amountOut = IKIP7(WKLAY).balanceOf(address(this));
        if (amountOut < amountOutMin)
            revert InsufficientAmount("DexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        IWKLAY(WKLAY).withdraw(amountOut);
        TransferHelper.safeTransferKLAY(to, amountOut);
    }

    // **** LIBRARY FUNCTIONS ****

    /**
     * @dev Given some asset amount and reserves, returns an amount of the 
     * other asset representing equivalent value.
     * Useful for calculating optimal token amounts before calling mint.
     */
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) public pure virtual override returns (uint256 amountB) {
        return DexLibrary.quote(amountA, reserveA, reserveB);
    }

    /**
    * @dev Given an input asset amount, returns the maximum output amount 
    * of the other asset (accounting for fees) given reserves.
    * Used in getAmountsOut.
    */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure virtual override returns (uint256 amountOut) {
        return DexLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    /**
    * @dev Returns the minimum input asset amount required to buy the given 
    * output asset amount (accounting for fees) given reserves.
    * Used in getAmountsIn. 
    */
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure virtual override returns (uint256 amountIn) {
        return DexLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    /**
    * @dev Given an input asset amount and an array of token addresses, calculates all subsequent
    * maximum output token amounts by calling getReserves for each pair of token addresses in the 
    * path in turn, and using these to call getAmountOut.
    * Useful for calculating optimal token amounts before calling swap.
    */
    function getAmountsOut(uint256 amountIn, address[] memory path)
        public
        view
        virtual
        override
        returns (uint256[] memory amounts)
    {
        return DexLibrary.getAmountsOut(factory, amountIn, path);
    }

    /**
    * @dev Given an output asset amount and an array of token addresses, calculates all preceding 
    * minimum input token amounts by calling getReserves for each pair of token addresses in the 
    * path in turn, and using these to call getAmountIn.
    * Useful for calculating optimal token amounts before calling swap.
    */
    function getAmountsIn(uint256 amountOut, address[] memory path)
        public
        view
        virtual
        override
        returns (uint256[] memory amounts)
    {
        return DexLibrary.getAmountsIn(factory, amountOut, path);
    }
}
