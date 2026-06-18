// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentReceiptRegistry {
    struct Receipt {
        uint256 id;
        address payer;
        address recipient;
        address token;
        uint256 amount;
        string serviceId;
        bytes32 requestHash;
        bytes32 paymentTxHash;
        uint256 timestamp;
    }

    uint256 private nextReceiptId = 1;
    mapping(uint256 => Receipt) private receipts;

    event ReceiptStored(
        uint256 indexed id,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 amount,
        string serviceId,
        bytes32 requestHash,
        bytes32 paymentTxHash
    );

    error InvalidRecipient();
    error InvalidAmount();

    function storeReceipt(
        address recipient,
        address token,
        uint256 amount,
        string calldata serviceId,
        bytes32 requestHash,
        bytes32 paymentTxHash
    ) external returns (uint256) {
        if (recipient == address(0)) {
            revert InvalidRecipient();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }

        uint256 id = nextReceiptId++;
        receipts[id] = Receipt({
            id: id,
            payer: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            serviceId: serviceId,
            requestHash: requestHash,
            paymentTxHash: paymentTxHash,
            timestamp: block.timestamp
        });

        emit ReceiptStored(id, msg.sender, recipient, token, amount, serviceId, requestHash, paymentTxHash);
        return id;
    }

    function getReceipt(uint256 id) external view returns (Receipt memory) {
        return receipts[id];
    }

    function verifyReceipt(
        uint256 id,
        address payer,
        address recipient,
        uint256 amount,
        string calldata serviceId
    ) external view returns (bool) {
        Receipt memory receipt = receipts[id];

        return receipt.id == id
            && receipt.payer == payer
            && receipt.recipient == recipient
            && receipt.amount == amount
            && keccak256(bytes(receipt.serviceId)) == keccak256(bytes(serviceId));
    }
}
