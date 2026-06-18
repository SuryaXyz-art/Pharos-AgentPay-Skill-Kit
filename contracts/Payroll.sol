// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Payroll {
    struct Stream {
        uint256 id;
        address employer;
        address worker;
        uint256 amountPerPeriod;
        uint256 intervalSeconds;
        uint256 nextPayAt;
        string roleId;
        bool active;
    }

    uint256 private nextStreamId = 1;
    mapping(uint256 => Stream) private streams;
    mapping(uint256 => uint256) public balances;

    event PayrollCreated(uint256 indexed id, address indexed employer, address indexed worker, uint256 amountPerPeriod, uint256 intervalSeconds, string roleId);
    event PayrollFunded(uint256 indexed id, uint256 amount);
    event PayrollPaid(uint256 indexed id, address indexed worker, uint256 amount);
    event PayrollCancelled(uint256 indexed id, uint256 refund);

    error InvalidWorker();
    error InvalidAmount();
    error InvalidInterval();
    error NotEmployer();
    error NotActive();
    error TooEarly();
    error InsufficientBalance();
    error TransferFailed();

    function createPayroll(
        address worker,
        uint256 amountPerPeriod,
        uint256 intervalSeconds,
        string calldata roleId
    ) external payable returns (uint256) {
        if (worker == address(0)) revert InvalidWorker();
        if (amountPerPeriod == 0) revert InvalidAmount();
        if (intervalSeconds == 0) revert InvalidInterval();

        uint256 id = nextStreamId++;
        streams[id] = Stream({
            id: id,
            employer: msg.sender,
            worker: worker,
            amountPerPeriod: amountPerPeriod,
            intervalSeconds: intervalSeconds,
            nextPayAt: block.timestamp,
            roleId: roleId,
            active: true
        });
        balances[id] = msg.value;

        emit PayrollCreated(id, msg.sender, worker, amountPerPeriod, intervalSeconds, roleId);
        if (msg.value > 0) emit PayrollFunded(id, msg.value);
        return id;
    }

    function fundPayroll(uint256 id) external payable {
        if (!streams[id].active) revert NotActive();
        if (msg.value == 0) revert InvalidAmount();

        balances[id] += msg.value;
        emit PayrollFunded(id, msg.value);
    }

    function pay(uint256 id) external {
        Stream storage stream = streams[id];
        if (!stream.active) revert NotActive();
        if (block.timestamp < stream.nextPayAt) revert TooEarly();
        if (balances[id] < stream.amountPerPeriod) revert InsufficientBalance();

        balances[id] -= stream.amountPerPeriod;
        stream.nextPayAt = block.timestamp + stream.intervalSeconds;

        (bool ok, ) = stream.worker.call{value: stream.amountPerPeriod}("");
        if (!ok) revert TransferFailed();

        emit PayrollPaid(id, stream.worker, stream.amountPerPeriod);
    }

    function cancelPayroll(uint256 id) external {
        Stream storage stream = streams[id];
        if (msg.sender != stream.employer) revert NotEmployer();
        if (!stream.active) revert NotActive();

        stream.active = false;
        uint256 refund = balances[id];
        balances[id] = 0;

        if (refund > 0) {
            (bool ok, ) = stream.employer.call{value: refund}("");
            if (!ok) revert TransferFailed();
        }

        emit PayrollCancelled(id, refund);
    }

    function getPayroll(uint256 id) external view returns (Stream memory) {
        return streams[id];
    }
}
