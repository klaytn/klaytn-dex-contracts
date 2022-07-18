// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "../libraries/DexLibrary.sol";
import "../libraries/TransferHelper.sol";
import "../interfaces/IDexRouter.sol";
import "../interfaces/IDexFactory.sol";
import "../interfaces/IKIP7.sol";
import "../interfaces/IWKLAY.sol";
import "./Errors.sol";

contract DexRouter is IDexRouter {
    address public immutable override factory;
    address public immutable override WKLAY;

    modifier ensure(uint256 deadline) {
        if (deadline < block.timestamp) revert Expired();
        _;
    }

    constructor(address _factory, address _WKLAY) {
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
        uint256 length = path.length - 1;
        for (uint256 i; i < length; i++) {
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
        if(amounts[0] > amountInMax) revert ExcessiveInputAmount();
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

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
        if(path[0] != WKLAY) revert InvalidPath();
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
        if(path[path.length - 1] != WKLAY) revert InvalidPath();
        amounts = DexLibrary.getAmountsIn(factory, amountOut, path);
        if(amounts[0] > amountInMax) revert ExcessiveInputAmount();
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
        if(path[path.length - 1] != WKLAY) revert InvalidPath();
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
        if(path[0] != WKLAY) revert InvalidPath();
        amounts = DexLibrary.getAmountsIn(factory, amountOut, path);
        if(amounts[0] > msg.value) revert ExcessiveInputAmount();
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
        for (uint256 i; i < path.length - 1; i++) {
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

    function swapExactKLAYForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        if(path[0] != WKLAY) revert InvalidPath();
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
        if(
            IKIP7(path[path.length - 1]).balanceOf(to) - balanceBefore <
                amountOutMin) revert InsufficientAmount(
            "DexRouter: INSUFFICIENT_OUTPUT_AMOUNT"
        );
    }

    function swapExactTokensForKLAYSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        if(path[path.length - 1] != WKLAY) revert InvalidPath();
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            DexLibrary.pairFor(factory, path[0], path[1]),
            amountIn
        );
        _swapSupportingFeeOnTransferTokens(path, address(this));
        uint256 amountOut = IKIP7(WKLAY).balanceOf(address(this));
        if(
            amountOut < amountOutMin) revert InsufficientAmount(
            "DexRouter: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        IWKLAY(WKLAY).withdraw(amountOut);
        TransferHelper.safeTransferKLAY(to, amountOut);
    }

    // **** LIBRARY FUNCTIONS ****
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) public pure virtual override returns (uint256 amountB) {
        return DexLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure virtual override returns (uint256 amountOut) {
        return DexLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure virtual override returns (uint256 amountIn) {
        return DexLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path)
        public
        view
        virtual
        override
        returns (uint256[] memory amounts)
    {
        return DexLibrary.getAmountsOut(factory, amountIn, path);
    }

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
