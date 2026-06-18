// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentMarketplace {
    struct AgentListing {
        uint256 id;
        address owner;
        string name;
        string endpoint;
        uint256 price;
        bytes32 metadataHash;
        bool active;
    }

    uint256 private nextListingId = 1;
    mapping(uint256 => AgentListing) private listings;

    event AgentListed(uint256 indexed id, address indexed owner, string name, uint256 price, bytes32 metadataHash);
    event AgentAccessPurchased(uint256 indexed id, address indexed buyer, address indexed owner, uint256 amount);
    event AgentListingUpdated(uint256 indexed id, bool active);

    error InvalidName();
    error InvalidEndpoint();
    error InvalidPrice();
    error NotOwner();
    error NotActive();
    error WrongAmount();
    error TransferFailed();

    function listAgent(
        string calldata name,
        string calldata endpoint,
        uint256 price,
        bytes32 metadataHash
    ) external returns (uint256) {
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(endpoint).length == 0) revert InvalidEndpoint();
        if (price == 0) revert InvalidPrice();

        uint256 id = nextListingId++;
        listings[id] = AgentListing({
            id: id,
            owner: msg.sender,
            name: name,
            endpoint: endpoint,
            price: price,
            metadataHash: metadataHash,
            active: true
        });

        emit AgentListed(id, msg.sender, name, price, metadataHash);
        return id;
    }

    function purchaseAccess(uint256 id) external payable {
        AgentListing memory listing = listings[id];
        if (!listing.active) revert NotActive();
        if (msg.value != listing.price) revert WrongAmount();

        (bool ok, ) = listing.owner.call{value: msg.value}("");
        if (!ok) revert TransferFailed();

        emit AgentAccessPurchased(id, msg.sender, listing.owner, msg.value);
    }

    function setListingActive(uint256 id, bool active) external {
        AgentListing storage listing = listings[id];
        if (msg.sender != listing.owner) revert NotOwner();

        listing.active = active;
        emit AgentListingUpdated(id, active);
    }

    function getListing(uint256 id) external view returns (AgentListing memory) {
        return listings[id];
    }
}
