// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EscrowPay {
    struct Escrow {
        uint256 id;
        address payer;
        address payee;
        uint256 amount;
        string serviceId;
        bool released;
        bool refunded;
        uint256 createdAt;
    }

    uint256 private nextEscrowId = 1;
    mapping(uint256 => Escrow) private escrows;

    event EscrowCreated(uint256 indexed id, address indexed payer, address indexed payee, uint256 amount, string serviceId);
    event EscrowReleased(uint256 indexed id, address indexed payee, uint256 amount);
    event EscrowRefunded(uint256 indexed id, address indexed payer, uint256 amount);

    error InvalidPayee();
    error InvalidAmount();
    error NotPayer();
    error AlreadySettled();
    error TransferFailed();

    function createEscrow(address payee, string calldata serviceId) external payable returns (uint256) {
        if (payee == address(0)) revert InvalidPayee();
        if (msg.value == 0) revert InvalidAmount();

        uint256 id = nextEscrowId++;
        escrows[id] = Escrow({
            id: id,
            payer: msg.sender,
            payee: payee,
            amount: msg.value,
            serviceId: serviceId,
            released: false,
            refunded: false,
            createdAt: block.timestamp
        });

        emit EscrowCreated(id, msg.sender, payee, msg.value, serviceId);
        return id;
    }

    function release(uint256 id) external {
        Escrow storage escrow = escrows[id];
        if (msg.sender != escrow.payer) revert NotPayer();
        if (escrow.released || escrow.refunded) revert AlreadySettled();

        escrow.released = true;
        (bool ok, ) = escrow.payee.call{value: escrow.amount}("");
        if (!ok) revert TransferFailed();

        emit EscrowReleased(id, escrow.payee, escrow.amount);
    }

    function refund(uint256 id) external {
        Escrow storage escrow = escrows[id];
        if (msg.sender != escrow.payer) revert NotPayer();
        if (escrow.released || escrow.refunded) revert AlreadySettled();

        escrow.refunded = true;
        (bool ok, ) = escrow.payer.call{value: escrow.amount}("");
        if (!ok) revert TransferFailed();

        emit EscrowRefunded(id, escrow.payer, escrow.amount);
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        return escrows[id];
    }
}
