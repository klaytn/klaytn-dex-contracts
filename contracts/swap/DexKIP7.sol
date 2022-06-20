// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import '../interfaces/IDexKIP7.sol';
import '../interfaces/IKIPReciever.sol';
import '../utils/Address.sol';
import '../utils/KIP13.sol';

contract DexKIP7 is IDexKIP7, KIP13 {
    using Address for address;

    string public constant name = 'DEXswap';
    string public constant symbol = 'KlayLP';
    uint8 public constant decimals = 18;
    uint  public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    // Equals to `bytes4(keccak256("onKIP7Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IKIP7Receiver(0).onKIP7Received.selector`
    bytes4 private constant _KIP7_RECEIVED = 0x9d188c22;

    bytes32 public immutable DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

    constructor() {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    /**
     * @dev See {IKIP13-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(IKIP13, KIP13)
        returns (bool)
    {
        return
            interfaceId == type(IKIP7).interfaceId ||
            interfaceId == type(IKIP7Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _mint(address to, uint amount) internal {
        totalSupply = totalSupply + amount;
        balanceOf[to] = balanceOf[to] + amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint amount) internal {
        balanceOf[from] = balanceOf[from] - amount;
        totalSupply = totalSupply - amount;
        emit Transfer(from, address(0), amount);
    }

    function _approve(address owner, address spender, uint amount) private {
        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(address from, address to, uint amount) private {
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "KIP7: transfer amount exceeds balance");
        unchecked {
            balanceOf[from] = fromBalance - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function approve(address spender, uint amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint amount) external returns (bool) {
        uint currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint).max) {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
    * @dev  Moves `amount` tokens from the caller's account to `recipient`.
    */
    function safeTransfer(address recipient, uint256 amount) external {
        safeTransfer(recipient, amount, "");
    }

    /**
    * @dev Moves `amount` tokens from the caller's account to `recipient`.
    */
    function safeTransfer(address recipient, uint256 amount, bytes memory data) public {
        require(recipient != address(0), "KIP7: transfer to the zero address");
        _transfer(msg.sender, recipient, amount);
        require(_checkOnKIP7Received(msg.sender, recipient, amount, data), "KIP7: transfer to non KIP7Receiver implementer");
    }

    /**
    * @dev Moves `amount` tokens from `sender` to `recipient` using the allowance mechanism.
    * `amount` is then deducted from the caller's allowance.
    */
    function safeTransferFrom(address sender, address recipient, uint256 amount) external {
        safeTransferFrom(sender, recipient, amount, "");
    }

    /**
    * @dev Moves `amount` tokens from `sender` to `recipient` using the allowance mechanism.
    * `amount` is then deducted from the caller's allowance.
    */
    function safeTransferFrom(address sender, address recipient, uint256 amount, bytes memory data) public {
        require(sender != address(0), "KIP7: transfer from the zero address");
        require(recipient != address(0), "KIP7: transfer to the zero address");

        uint currentAllowance = allowance[sender][msg.sender];
        if (currentAllowance != type(uint).max) {
            require(currentAllowance >= amount, "KIP7: insufficient allowance");
            allowance[sender][msg.sender] = currentAllowance - amount;
        }
        _transfer(sender, recipient, amount);
        require(_checkOnKIP7Received(sender, recipient, amount, data), "KIP7: transfer to non KIP7Receiver implementer");
    }

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'DEX: EXPIRED');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'DEX: INVALID_SIGNATURE');
        _approve(owner, spender, value);
    }

    /**
     * @dev Internal function to invoke `onKIP7Received` on a target address.
     * The call is not executed if the target address is not a contract.
     */
    function _checkOnKIP7Received(address sender, address recipient, uint256 amount, bytes memory _data)
        internal returns (bool)
    {
        if (!recipient.isContract()) {
            return true;
        }

        bytes4 retval = IKIP7TokenReceiver(recipient).onKIP7Received(msg.sender, sender, amount, _data);
        return (retval == _KIP7_RECEIVED);
    }
}
