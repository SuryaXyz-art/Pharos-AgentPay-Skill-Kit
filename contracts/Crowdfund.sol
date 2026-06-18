// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfund {
    struct Campaign {
        uint256 id;
        address creator;
        string title;
        uint256 goal;
        uint256 totalRaised;
        uint256 deadline;
        bool claimed;
    }

    uint256 private nextCampaignId = 1;
    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 indexed id, address indexed creator, string title, uint256 goal, uint256 deadline);
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);
    event Claimed(uint256 indexed id, address indexed creator, uint256 amount);
    event Refunded(uint256 indexed id, address indexed contributor, uint256 amount);

    error InvalidGoal();
    error InvalidDeadline();
    error InvalidAmount();
    error NotCreator();
    error CampaignOpen();
    error GoalNotMet();
    error GoalMet();
    error AlreadyClaimed();
    error NothingToRefund();
    error TransferFailed();

    function createCampaign(string calldata title, uint256 goal, uint256 durationSeconds) external returns (uint256) {
        if (goal == 0) revert InvalidGoal();
        if (durationSeconds == 0) revert InvalidDeadline();

        uint256 id = nextCampaignId++;
        uint256 deadline = block.timestamp + durationSeconds;
        campaigns[id] = Campaign({
            id: id,
            creator: msg.sender,
            title: title,
            goal: goal,
            totalRaised: 0,
            deadline: deadline,
            claimed: false
        });

        emit CampaignCreated(id, msg.sender, title, goal, deadline);
        return id;
    }

    function contribute(uint256 id) external payable {
        Campaign storage campaign = campaigns[id];
        if (campaign.id == 0 || block.timestamp > campaign.deadline) revert CampaignOpen();
        if (msg.value == 0) revert InvalidAmount();

        contributions[id][msg.sender] += msg.value;
        campaign.totalRaised += msg.value;
        emit Contributed(id, msg.sender, msg.value);
    }

    function claim(uint256 id) external {
        Campaign storage campaign = campaigns[id];
        if (msg.sender != campaign.creator) revert NotCreator();
        if (block.timestamp <= campaign.deadline) revert CampaignOpen();
        if (campaign.totalRaised < campaign.goal) revert GoalNotMet();
        if (campaign.claimed) revert AlreadyClaimed();

        campaign.claimed = true;
        (bool ok, ) = campaign.creator.call{value: campaign.totalRaised}("");
        if (!ok) revert TransferFailed();

        emit Claimed(id, campaign.creator, campaign.totalRaised);
    }

    function refund(uint256 id) external {
        Campaign storage campaign = campaigns[id];
        if (block.timestamp <= campaign.deadline) revert CampaignOpen();
        if (campaign.totalRaised >= campaign.goal) revert GoalMet();

        uint256 amount = contributions[id][msg.sender];
        if (amount == 0) revert NothingToRefund();

        contributions[id][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Refunded(id, msg.sender, amount);
    }

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return campaigns[id];
    }
}
