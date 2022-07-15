// SPDX-License-Identifier: MIT
pragma solidity =0.8.12;

/// @title KIP-7 Fungible Token Standard
///  Note: the KIP-13 identifier for this interface is 0x65787371.
interface IKIP7 {
    /// @dev Emitted when `value` tokens are moved from one account (`from`) to
    /// another (`to`) and created (`from` == 0) and destroyed(`to` == 0).
    ///
    /// Note that `value` may be zero.
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @dev Emitted when the allowance of a `spender` for an `owner` is set by
    /// a call to {approve}. `value` is the new allowance.
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice Returns the amount of tokens in existence.
    /// @return the total supply of this token.
    function totalSupply() external view returns (uint256);

    /// @notice Returns the amount of tokens owned by `account`.
    /// @param account An address for whom to query the balance
    /// @return the amount of tokens owned by `account.
    function balanceOf(address account) external view returns (uint256);

    /// @notice Moves `amount` tokens from the caller's account to `recipient`.
    /// @dev Throws if the message caller's balance does not have enough tokens to spend.
    /// Throws if the contract is pausable and paused.	
    ///
    /// Emits a {Transfer} event.
    /// @param recipient The owner will receive the tokens.
    /// @param amount The token amount will be transferred.
    /// @return A boolean value indicating whether the operation succeeded.
    function transfer(address recipient, uint256 amount) external returns (bool);

    /// @notice Returns the remaining number of tokens that `spender` will be
    /// allowed to spend on behalf of `owner` through {transferFrom}. This is
    /// zero by default.
    /// @dev Throws if the contract is pausable and paused.	
    ///
    /// This value changes when {approve} or {transferFrom} are called.
    /// @param owner The account allowed `spender` to withdraw the tokens from the account.
    /// @param spender The address is approved to withdraw the tokens.
    /// @return An amount of spender's token approved by owner.
    function allowance(address owner, address spender) external view returns (uint256);

    /// @notice Sets `amount` as the allowance of `spender` over the caller's tokens.
    /// @dev Throws if the contract is pausable and paused.
    ///
    /// IMPORTANT: Beware that changing an allowance with this method brings the risk
    /// that someone may use both the old and the new allowance by unfortunate
    /// transaction ordering. One possible solution to mitigate this race
    /// condition is to first reduce the spender's allowance to 0 and set the
    /// desired value afterwards:
    /// https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    ///
    /// Emits an {Approval} event.
    /// @param spender The address is approved to withdraw the tokens.
    /// @param amount The token amount will be approved.
    /// @return a boolean value indicating whether the operation succeeded.
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice Moves `amount` tokens from `sender` to `recipient` using the
    /// allowance mechanism. `amount` is then deducted from the caller's
    /// allowance.
    /// @dev Throw unless the `sender` account has deliberately authorized the sender of the message via some mechanism.
    /// Throw if `sender` or `recipient` is the zero address.
    /// Throws if the contract is pausable and paused.	
    ///
    /// Emits a {Transfer} event.
    /// Emits an `Approval` event indicating the updated allowance.
    /// @param sender The current owner of the tokens.
    /// @param recipient The owner will receive the tokens.
    /// @param amount The token amount will be transferred.
    /// @return A boolean value indicating whether the operation succeeded.
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    /// @notice Moves `amount` tokens from the caller's account to `recipient`.
    /// @dev Throws if the message caller's balance does not have enough tokens to spend.
    /// Throws if the contract is pausable and paused.	
    /// Throws if `_to` is the zero address. 
    /// When transfer is complete, this function checks if `_to` is a smart 
    /// contract (code size > 0). If so, it calls
    ///  `onKIP7Received` on `_to` and throws if the return value is not
    ///  `bytes4(keccak256("onKIP7Received(address,address,uint256,bytes)"))`.
    /// @param recipient The owner will receive the tokens.
    /// @param amount The token amount will be transferred.
    /// @param data Additional data with no specified format, sent in call to `_to`
    function safeTransfer(address recipient, uint256 amount, bytes memory data) external;
    
    
    /// @notice Moves `amount` tokens from the caller's account to `recipient`.
    /// @dev This works identically to the other function with an extra data parameter,
    ///  except this function just sets data to "".
    /// @param recipient The owner will receive the tokens.
    /// @param amount The token amount will be transferred.
    function safeTransfer(address recipient, uint256 amount) external;
    
    /// @notice Moves `amount` tokens from `sender` to `recipient` using the
    /// allowance mechanism. `amount` is then deducted from the caller's
    /// allowance.
    /// @dev Throw unless the `sender` account has deliberately authorized the sender of the message via some mechanism.
    /// Throw if `sender` or `recipient` is the zero address.
    /// Throws if the contract is pausable and paused.
    /// When transfer is complete, this function checks if `_to` is a smart 
    /// contract (code size > 0). If so, it calls
    ///  `onKIP7Received` on `_to` and throws if the return value is not
    ///  `bytes4(keccak256("onKIP7Received(address,address,uint256,bytes)"))`.
    /// Emits a {Transfer} event.
    /// Emits an `Approval` event indicating the updated allowance.
    /// @param sender The current owner of the tokens.
    /// @param recipient The owner will receive the tokens.
    /// @param amount The token amount will be transferred.
    /// @param data Additional data with no specified format, sent in call to `_to`
    function safeTransferFrom(address sender, address recipient, uint256 amount, bytes memory data) external;

    /// @notice Moves `amount` tokens from `sender` to `recipient` using the
    /// allowance mechanism. `amount` is then deducted from the caller's
    /// allowance.
    /// @dev This works identically to the other function with an extra data parameter,
    ///  except this function just sets data to "".
    /// @param sender The current owner of the tokens.
    /// @param recipient The owner will receive the tokens.
    /// @param amount The token amount will be transferred.
    function safeTransferFrom(address sender, address recipient, uint256 amount) external;
}
