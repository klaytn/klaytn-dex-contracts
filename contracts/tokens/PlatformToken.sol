// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "./extensions/KIP7Votes.sol";
import "../utils/access/AccessControl.sol";

contract PlatformToken is KIP7Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(
        string memory _name,
        string memory _symbol,
        address _multisig
    ) KIP7(_name, _symbol) KIP7Permit(_name) {
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        // _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev See {IKIP13-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(KIP7, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IKIP7Permit).interfaceId ||
            interfaceId == type(IVotes).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function mint(address account, uint256 amount) onlyRole(MINTER_ROLE) external returns(bool) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) onlyRole(BURNER_ROLE) external {
        _burn(account, amount);
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }
}
