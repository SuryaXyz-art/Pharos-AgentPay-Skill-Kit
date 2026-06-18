// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TradingSignalGenerator {
    struct TradingSignal {
        uint256 id;
        address publisher;
        string symbol;
        string direction;
        uint8 confidence;
        uint256 targetPrice;
        bytes32 metadataHash;
        uint256 timestamp;
    }

    uint256 private nextSignalId = 1;
    mapping(uint256 => TradingSignal) private signals;

    event TradingSignalPublished(
        uint256 indexed id,
        address indexed publisher,
        string symbol,
        string direction,
        uint8 confidence,
        uint256 targetPrice,
        bytes32 metadataHash
    );

    error InvalidSymbol();
    error InvalidDirection();
    error InvalidConfidence();

    function publishSignal(
        string calldata symbol,
        string calldata direction,
        uint8 confidence,
        uint256 targetPrice,
        bytes32 metadataHash
    ) external returns (uint256) {
        if (bytes(symbol).length == 0) revert InvalidSymbol();
        if (bytes(direction).length == 0) revert InvalidDirection();
        if (confidence > 100) revert InvalidConfidence();

        uint256 id = nextSignalId++;
        signals[id] = TradingSignal({
            id: id,
            publisher: msg.sender,
            symbol: symbol,
            direction: direction,
            confidence: confidence,
            targetPrice: targetPrice,
            metadataHash: metadataHash,
            timestamp: block.timestamp
        });

        emit TradingSignalPublished(id, msg.sender, symbol, direction, confidence, targetPrice, metadataHash);
        return id;
    }

    function getSignal(uint256 id) external view returns (TradingSignal memory) {
        return signals[id];
    }
}
