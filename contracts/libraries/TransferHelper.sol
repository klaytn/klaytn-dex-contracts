// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

// helper methods for interacting with ERC20/KIP7 tokens and sending KLAY that do not consistently return true/false
library TransferHelper {
    function safeApprove(address token, address to, uint value) internal {
        // Approve selector `bytes4(keccak256(bytes('approve(address,uint256)')))` should be equal to 0x095ea7b3
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(bytes4(keccak256(bytes('approve(address,uint256)'))), to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: APPROVE_FAILED');
    }

    function safeTransfer(address token, address to, uint value) internal {
        // Transfer selector `bytes4(keccak256(bytes('transfer(address,uint256)')))` should be equal to 0xa9059cbb
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(bytes4(keccak256(bytes('transfer(address,uint256)'))), to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FAILED');
    }

    function safeTransferFrom(address token, address from, address to, uint value) internal {
        // transferFrom selector `bytes4(keccak256(bytes('transferFrom(address,address,uint256)')))` should be equal to 0x23b872dd
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(bytes4(keccak256(bytes('transferFrom(address,address,uint256)'))), from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FROM_FAILED');
    }

    function safeTransferKLAY(address to, uint value) internal {
        (bool success,) = to.call{value:value}(new bytes(0));
        require(success, 'TransferHelper: KLAY_TRANSFER_FAILED');
    }
}