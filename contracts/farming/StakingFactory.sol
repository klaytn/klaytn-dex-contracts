// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.12;

import "../utils/access/Ownable.sol";
import "./StakingFactoryPool.sol";
import "../interfaces/IKIP7.sol";

contract StakingFactory is Ownable {
    event NewStakingContract(address indexed staking);

    constructor(address _multisig) {
        // Transfer ownership to the multisig contract who becomes the owner of the contract
        transferOwnership(_multisig);
    }

    /**
     * @notice Deploy new staking pool contract
     * @dev Should only be called by the multisig contract
     * @param _stakedToken staked token address
     * @param _rewardToken reward token address
     * @param _rewardPerBlock reward per block (in rewardToken)
     * @param _startBlock start block
     * @param _rewardEndBlock end block
     * @param _poolLimitPerUser pool limit per user in stakedToken (if any, else 0)
     * @param _numberBlocksForUserLimit: block numbers available for user limit (after start block)
     * @param _multisig address with ownership
     * @return staking address of new staking pool contract
     */
    function deployPool(
        address _stakedToken,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _rewardEndBlock,
        uint256 _poolLimitPerUser,
        uint256 _numberBlocksForUserLimit,
        address _multisig
    ) external onlyOwner returns (address staking) {
        require(IKIP7(_stakedToken).totalSupply() >= 0);
        require(IKIP7(_rewardToken).totalSupply() >= 0);
        require(_stakedToken != _rewardToken, "Tokens must be be different");

        staking = address(
            new StakingInitializable{
                salt: keccak256(
                    abi.encodePacked(_stakedToken, _rewardToken, _startBlock)
                )
            }()
        );

        StakingInitializable(staking).initialize(
            _stakedToken,
            _rewardToken,
            _rewardPerBlock,
            _startBlock,
            _rewardEndBlock,
            _poolLimitPerUser,
            _numberBlocksForUserLimit,
            _multisig
        );
        emit NewStakingContract(staking);
    }
}
