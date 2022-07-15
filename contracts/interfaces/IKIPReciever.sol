// SPDX-License-Identifier: MIT
pragma solidity =0.8.12;

/// @title KIP-7 Fungible Token Standard, optional wallet interface
/// @dev Note: the KIP-13 identifier for this interface is 0x9d188c22.
interface IKIP7TokenReceiver {
    /// @notice Handle the receipt of KIP-7 token
    /// @dev The KIP-7 smart contract calls this function on the recipient
    ///  after a `safeTransfer`. This function MAY throw to revert and reject the
    ///  transfer. Return of other than the magic value MUST result in the
    ///  transaction being reverted.
    ///  Note: the contract address is always the message sender.
    /// @param _operator The address which called `safeTransferFrom` function
    /// @param _from The address which previously owned the token
    /// @param _amount The token amount which is being transferred.
    /// @param _data Additional data with no specified format
    /// @return `bytes4(keccak256("onKIP7Received(address,address,uint256,bytes)"))`
    ///  unless throwing
    function onKIP7Received(address _operator, address _from, uint256 _amount, bytes memory _data) external returns(bytes4);
}