// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "@klaytn/contracts/access/Ownable.sol";
import "@klaytn/contracts/security/ReentrancyGuard.sol";
import "@klaytn/contracts/KIP/interfaces/IKIP7Metadata.sol";
import "../libraries/TransferHelper.sol";
import "@klaytn/contracts/utils/math/SafeCast.sol";

contract StakingInitializable is Ownable, ReentrancyGuard {
    using SafeCast for uint256;
    // The address of the smart chef factory
    address public immutable STAKING_FACTORY;
    // The precision factor
    uint256 public constant PRECISION_FACTOR = 10e18;

    struct PoolInfo {
        // Whether it is initialized
        bool isInitialized;
        // The staked token
        address stakedToken;
        // Whether a limit is set for users
        bool userLimit;
        // The reward token
        address rewardToken;
        // The block number when PTN mining starts.
        uint64 startBlock;
        // The block number when PTN mining ends.
        uint64 rewardEndBlock;
        // The block number of the last pool update
        uint64 lastRewardBlock;
        // Block numbers available for user limit (after start block)
        uint64 numberBlocksForUserLimit;
        // The pool limit (0 if none)
        uint256 poolLimitPerUser;
        // Accrued token per share
        uint256 accTokenPerShare;
        // PTN tokens created per block.
        uint256 rewardPerBlock;
        // Staked amount of tokens
        uint256 totalStaked;
    }

    PoolInfo public pool;

    struct UserInfo {
        uint256 amount; // How many staked tokens the user has provided
        uint256 rewardDebt; // Reward debt
    }
    // Info of each user that stakes tokens (stakedToken)
    mapping(address => UserInfo) public userInfo;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event UpdatePool(
        uint256 lastRewardBlock,
        uint256 stakedTokenSupply,
        uint256 accTokenPerShare
    );
    event NewStartAndEndBlocks(uint256 startBlock, uint256 endBlock);
    event NewRewardPerBlock(uint256 rewardPerBlock);
    event NewPoolLimit(uint256 poolLimitPerUser);
    event RewardsStop(uint256 blockNumber);
    event TokenRecovery(address indexed token, address recipient, uint256 amount);

    constructor() {
        STAKING_FACTORY = msg.sender;
    }

    /**
     * @notice Initialize the contract
     * @param _stakedToken: staked token address
     * @param _rewardToken: reward token address
     * @param _rewardPerBlock: reward per block (in rewardToken)
     * @param _startBlock: start block
     * @param _rewardEndBlock: end block
     * @param _poolLimitPerUser: pool limit per user in stakedToken (if any, else 0)
     * @param _numberBlocksForUserLimit: block numbers available for user limit (after start block)
     * @param _multisig: admin address with ownership
     */
    function initialize(
        address _stakedToken,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _rewardEndBlock,
        uint256 _poolLimitPerUser,
        uint256 _numberBlocksForUserLimit,
        address _multisig
    ) external {
        require(!pool.isInitialized, "Already initialized");
        require(msg.sender == STAKING_FACTORY, "Not factory");
        require(_startBlock < _rewardEndBlock, "Invalid start block");

        uint256 decimalsRewardToken = uint256(
            IKIP7Metadata(_rewardToken).decimals()
        );
        require(decimalsRewardToken < 30, "Must be less than 30");
        
        // Make this contract initialized
        pool.isInitialized = true;

        pool.stakedToken = _stakedToken;
        pool.rewardToken = _rewardToken;
        pool.startBlock = _startBlock.toUint64();
        pool.rewardEndBlock = _rewardEndBlock.toUint64();
        pool.lastRewardBlock = _startBlock.toUint64();
        pool.rewardPerBlock = _rewardPerBlock;

        if (_poolLimitPerUser > 0) {
            pool.userLimit = true;
            pool.poolLimitPerUser = _poolLimitPerUser;
            pool.numberBlocksForUserLimit = _numberBlocksForUserLimit
                .toUint64();
        }

        // Transfer ownership to the multisig address who becomes owner of the contract
        transferOwnership(_multisig);
    }

    /**
     * @dev Deposit staked tokens and collect reward tokens (if any)
     * @param _amount amount to deposit (in stakedToken)
     */
    function deposit(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        pool.userLimit = hasUserLimit();

        require(
            !pool.userLimit ||
                ((_amount + user.amount) <= pool.poolLimitPerUser),
            "Deposit: Amount above limit"
        );

        _updatePool();
        uint256 share = pool.accTokenPerShare;
        if (user.amount > 0) {
            uint256 pending = (user.amount * share) /
                PRECISION_FACTOR -
                user.rewardDebt;
            if (pending > 0) {
                TransferHelper.safeTransfer(
                    pool.rewardToken,
                    msg.sender,
                    pending
                );
            }
        }

        if (_amount > 0) {
            user.amount = user.amount + _amount;
            pool.totalStaked += _amount;
            TransferHelper.safeTransferFrom(
                pool.stakedToken,
                msg.sender,
                address(this),
                _amount
            );
        }

        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;

        emit Deposit(msg.sender, _amount);
    }

    /**
     * @notice Withdraw staked tokens and collect reward tokens(if any)
     * @param _amount amount to withdraw (in stakedToken)
     */
    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "Amount to withdraw too high");

        _updatePool();
        uint256 share = pool.accTokenPerShare;
        uint256 pending = (user.amount * share) /
            PRECISION_FACTOR -
            user.rewardDebt;

        if (_amount > 0) {
            user.amount = user.amount - _amount;
            pool.totalStaked -= _amount;
            TransferHelper.safeTransfer(pool.stakedToken, msg.sender, _amount);
        }

        if (pending > 0) {
            TransferHelper.safeTransfer(pool.rewardToken, msg.sender, pending);
        }

        user.rewardDebt = (user.amount * share) / PRECISION_FACTOR;

        emit Withdraw(msg.sender, _amount);
    }

    /**
     * @notice Withdraw staked tokens without caring about rewards
     * @dev Needs to be for emergency.
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amountToTransfer = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        if (amountToTransfer > 0) {
            TransferHelper.safeTransfer(
                pool.stakedToken,
                msg.sender,
                amountToTransfer
            );
        }

        emit EmergencyWithdraw(msg.sender, amountToTransfer);
    }

    /**
     * @notice Transfers reward tokens from the contract to the specified address
     * @dev Only callable by multisig contract. Needs to be for emergency.
     * @param _amount: Amount of reward tokens to transfer
     * @param _recipient: A wallet's address to trasfer tokens to
     */
    function emergencyRewardWithdraw(uint256 _amount, address _recipient) external onlyOwner {
        require(_recipient != address(0), "Withdraw to the zero address");
        TransferHelper.safeTransfer(pool.rewardToken, _recipient, _amount);
    }

    /**
     * @notice Allows the multisig contract to recover tokens sent to the contract by mistake
     * @param _token: Recoverable token address
     * @param _recipient: A wallet's address to trasfer tokens to
     * @dev Callable by multisig contract
     */
    function recoverToken(address _token, address _recipient) external onlyOwner {
        require(_recipient != address(0), "Recover to the zero address");
        require(
            _token != pool.stakedToken,
            "Operations: Cannot recover staked token"
        );
        require(
            _token != pool.rewardToken,
            "Operations: Cannot recover reward token"
        );

        uint256 balance = IKIP7Metadata(_token).balanceOf(address(this));
        require(balance != 0, "Operations: Cannot recover zero balance");

        TransferHelper.safeTransfer(_token, _recipient, balance);

        emit TokenRecovery(_token, _recipient, balance);
    }

    /**
     * @notice Stop pool rewards.
     * @dev Only callable by the multisig contract. Should be called only in emergency situations.
     * Sets the pool's reward-end block to the current block. This will effect the result of `_getMultiplier`
     * function called with the next `_updatePool`, and the pool rewards will be no longer updated.
     */
    function stopReward() external onlyOwner {
        pool.rewardEndBlock = (block.number).toUint64();
        emit RewardsStop(pool.rewardEndBlock);
    }

    /**
     * @notice Update pool limit per user
     * @dev Only callable by multisig contract.
     * @param _userLimit: whether the limit remains forced
     * @param _poolLimitPerUser: new pool limit per user
     */
    function updatePoolLimitPerUser(bool _userLimit, uint256 _poolLimitPerUser)
        external
        onlyOwner
    {
        require(pool.userLimit, "Must be set");
        if (_userLimit) {
            require(
                _poolLimitPerUser > pool.poolLimitPerUser,
                "New limit must be higher"
            );
            pool.poolLimitPerUser = _poolLimitPerUser;
        } else {
            pool.userLimit = _userLimit;
            pool.poolLimitPerUser = 0;
        }
        emit NewPoolLimit(pool.poolLimitPerUser);
    }

    /**
     * @notice Update reward per block
     * @dev Only callable by multisig contract.
     * @param _rewardPerBlock: the reward per block
     */
    function updateRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        require(block.number < pool.startBlock, "Pool has started");
        pool.rewardPerBlock = _rewardPerBlock;
        emit NewRewardPerBlock(_rewardPerBlock);
    }

    /**
     * @notice It allows the multisig contract to update start and end blocks
     * @dev This function is only callable by multisig contract.
     * @param _startBlock: the new start block
     * @param _rewardEndBlock: the new end block
     */
    function updateStartAndEndBlocks(
        uint256 _startBlock,
        uint256 _rewardEndBlock
    ) external onlyOwner {
        require(block.number < pool.startBlock, "Pool has started");
        require(
            _startBlock < _rewardEndBlock,
            "New startBlock must be lower than new endBlock"
        );
        require(
            block.number < _startBlock,
            "New startBlock must be higher than current block"
        );

        pool.startBlock = _startBlock.toUint64();
        pool.rewardEndBlock = _rewardEndBlock.toUint64();

        // Set the lastRewardBlock as the startBlock
        pool.lastRewardBlock = _startBlock.toUint64();

        emit NewStartAndEndBlocks(_startBlock, _rewardEndBlock);
    }

    /**
     * @notice View function to see pending reward on frontend.
     * @param _user: user's address
     * @return Pending reward for a given user
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 stakedTokenSupply = pool.totalStaked;
        uint256 share = pool.accTokenPerShare;
        if (block.number > pool.lastRewardBlock && stakedTokenSupply != 0) {
            uint256 multiplier = _getMultiplier(
                pool.lastRewardBlock,
                block.number
            );
            uint256 ptnReward = multiplier * pool.rewardPerBlock;
            uint256 adjustedTokenPerShare = share +
                (ptnReward * PRECISION_FACTOR) /
                stakedTokenSupply;
            return
                (user.amount * adjustedTokenPerShare) /
                PRECISION_FACTOR -
                user.rewardDebt;
        } else {
            return (user.amount * share) / PRECISION_FACTOR - user.rewardDebt;
        }
    }

    /**
     * @notice Update reward variables of the given pool to be up-to-date.
     * @dev If the current block number is higher than the reward-end block,
     * the pool rewads are no longer updated (stopped).
     */
    function _updatePool() internal {
        if (block.number > pool.lastRewardBlock) {
            uint256 stakedTokenSupply = pool.totalStaked;
            if (stakedTokenSupply > 0) {
                uint256 multiplier = _getMultiplier(
                    pool.lastRewardBlock,
                    block.number
                );
                uint256 ptnReward = multiplier * pool.rewardPerBlock;
                pool.accTokenPerShare =
                    pool.accTokenPerShare +
                    (ptnReward * PRECISION_FACTOR) /
                    stakedTokenSupply;
            }
            pool.lastRewardBlock = (block.number).toUint64();
            emit UpdatePool(
                pool.lastRewardBlock,
                stakedTokenSupply,
                pool.accTokenPerShare
            );
        }
    }

    /**
     * @notice Return reward multiplier over the given `_from` to `_to` block.
     * If the `from` block is higher than the pool's reward-end block,  
     * the function returns 0 and therefore rewards are no longer updated.
     * @param _from: block to start
     * @param _to: block to finish
     */
    function _getMultiplier(uint256 _from, uint256 _to)
        internal
        view
        returns (uint256)
    {
        if (_to <= pool.rewardEndBlock) {
            return _to - _from;
        } else if (_from >= pool.rewardEndBlock) {
            return 0;
        } else {
            return pool.rewardEndBlock - _from;
        }
    }

    /**
     * @notice Return user limit is set or zero.
     */
    function hasUserLimit() public view returns (bool) {
        if (
            !pool.userLimit ||
            (block.number >= (pool.startBlock + pool.numberBlocksForUserLimit))
        ) {
            return false;
        }

        return true;
    }
}
