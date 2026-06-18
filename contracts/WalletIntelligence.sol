// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WalletIntelligence {
    struct WalletSignal {
        uint256 id;
        address wallet;
        address reporter;
        uint8 riskScore;
        string label;
        bytes32 metadataHash;
        uint256 timestamp;
    }

    uint256 private nextSignalId = 1;
    mapping(uint256 => WalletSignal) private signals;
    mapping(address => uint256) public latestSignalForWallet;

    event WalletSignalSubmitted(
        uint256 indexed id,
        address indexed wallet,
        address indexed reporter,
        uint8 riskScore,
        string label,
        bytes32 metadataHash
    );

    error InvalidWallet();
    error InvalidRiskScore();

    function submitWalletSignal(
        address wallet,
        uint8 riskScore,
        string calldata label,
        bytes32 metadataHash
    ) external returns (uint256) {
        if (wallet == address(0)) revert InvalidWallet();
        if (riskScore > 100) revert InvalidRiskScore();

        uint256 id = nextSignalId++;
        signals[id] = WalletSignal({
            id: id,
            wallet: wallet,
            reporter: msg.sender,
            riskScore: riskScore,
            label: label,
            metadataHash: metadataHash,
            timestamp: block.timestamp
        });
        latestSignalForWallet[wallet] = id;

        emit WalletSignalSubmitted(id, wallet, msg.sender, riskScore, label, metadataHash);
        return id;
    }

    function getSignal(uint256 id) external view returns (WalletSignal memory) {
        return signals[id];
    }

    function getLatestSignal(address wallet) external view returns (WalletSignal memory) {
        return signals[latestSignalForWallet[wallet]];
    }
}
