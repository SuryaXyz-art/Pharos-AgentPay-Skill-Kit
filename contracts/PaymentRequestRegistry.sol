// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PaymentRequestRegistry {
    struct PaymentRequest {
        uint256 id;
        address requester;
        address payer;
        uint256 amount;
        string serviceId;
        string memo;
        bool paid;
        bool cancelled;
        uint256 createdAt;
        uint256 paidAt;
    }

    uint256 private nextRequestId = 1;
    mapping(uint256 => PaymentRequest) private requests;

    event PaymentRequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount, string serviceId);
    event PaymentRequestPaid(uint256 indexed id, address indexed payer, uint256 amount);
    event PaymentRequestCancelled(uint256 indexed id);

    error InvalidAmount();
    error NotRequester();
    error NotAllowedPayer();
    error AlreadyClosed();
    error WrongAmount();
    error TransferFailed();

    function createRequest(
        address payer,
        uint256 amount,
        string calldata serviceId,
        string calldata memo
    ) external returns (uint256) {
        if (amount == 0) revert InvalidAmount();

        uint256 id = nextRequestId++;
        requests[id] = PaymentRequest({
            id: id,
            requester: msg.sender,
            payer: payer,
            amount: amount,
            serviceId: serviceId,
            memo: memo,
            paid: false,
            cancelled: false,
            createdAt: block.timestamp,
            paidAt: 0
        });

        emit PaymentRequestCreated(id, msg.sender, payer, amount, serviceId);
        return id;
    }

    function payRequest(uint256 id) external payable {
        PaymentRequest storage request = requests[id];
        if (request.paid || request.cancelled) revert AlreadyClosed();
        if (request.payer != address(0) && msg.sender != request.payer) revert NotAllowedPayer();
        if (msg.value != request.amount) revert WrongAmount();

        request.paid = true;
        request.payer = msg.sender;
        request.paidAt = block.timestamp;

        (bool ok, ) = request.requester.call{value: msg.value}("");
        if (!ok) revert TransferFailed();

        emit PaymentRequestPaid(id, msg.sender, msg.value);
    }

    function cancelRequest(uint256 id) external {
        PaymentRequest storage request = requests[id];
        if (msg.sender != request.requester) revert NotRequester();
        if (request.paid || request.cancelled) revert AlreadyClosed();

        request.cancelled = true;
        emit PaymentRequestCancelled(id);
    }

    function getRequest(uint256 id) external view returns (PaymentRequest memory) {
        return requests[id];
    }
}
