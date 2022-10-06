// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPlatformToken {

    /**
     * @dev Creates `amount` tokens and assigns them to `account`
     * increasing the total supply.
     *
     * Requirements:
     *
     * - caller must have the {KIP7Mintable-MINTER_ROLE}
     *
     * Emits a {Transfer} event with 0X0 as the `from` account
     */

    function mint(address account, uint256 amount) external returns (bool);
    /**
     * @dev Destroys `amount` tokens from `account`
     *
     * Requirements:
     *
     * - caller must have the {KIP7Mintable-BURNER_ROLE}
     *
     * Emits a {Transfer} event with the 0x0 address as `to`.
     */
    function burn(address account, uint256 amount) external;

    /**
     * @dev Returns chain ID
     */
    function getChainId() external view returns (uint256);

}