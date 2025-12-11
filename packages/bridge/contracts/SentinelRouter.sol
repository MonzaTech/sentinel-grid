// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import "@hyperlane-xyz/core/contracts/interfaces/IInterchainSecurityModule.sol";
import "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SentinelRouter
 * @author Sentinel Grid (Monza Tech LLC)
 * @notice Cross-chain router for Sentinel Grid data anchoring
 * @dev Uses Hyperlane for cross-chain messaging to sync anchors across chains
 * 
 * Features:
 * - Send anchor hashes to remote chains
 * - Receive and verify anchors from other chains
 * - Multi-chain anchor synchronization
 * - Configurable remote routers
 */
contract SentinelRouter is IMessageRecipient, Ownable, ReentrancyGuard {
    // =========================================================================
    // Types
    // =========================================================================

    /**
     * @notice Represents a received cross-chain anchor
     */
    struct RemoteAnchor {
        uint32 originDomain;
        bytes32 sender;
        bytes32 dataHash;
        string ipfsCid;
        uint256 anchorIndex;
        uint256 originalTimestamp;
        uint256 receivedAt;
        bool verified;
    }

    // =========================================================================
    // State
    // =========================================================================

    /// @notice Hyperlane Mailbox contract
    IMailbox public immutable mailbox;

    /// @notice Optional custom ISM
    IInterchainSecurityModule public interchainSecurityModule;

    /// @notice Mapping of domain to remote router address
    mapping(uint32 => bytes32) public remoteRouters;

    /// @notice Mapping of data hash to remote anchor
    mapping(bytes32 => RemoteAnchor) public remoteAnchors;

    /// @notice Array of all received anchor hashes
    bytes32[] public anchorHashes;

    /// @notice Total number of anchors received
    uint256 public anchorCount;

    /// @notice Reference to local DataAnchor contract (optional)
    address public localAnchorContract;

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Emitted when an anchor is sent to a remote chain
     */
    event AnchorSent(
        bytes32 indexed messageId,
        uint32 indexed destinationDomain,
        bytes32 dataHash,
        string ipfsCid
    );

    /**
     * @notice Emitted when an anchor is received from a remote chain
     */
    event AnchorReceived(
        uint32 indexed originDomain,
        bytes32 indexed dataHash,
        string ipfsCid,
        uint256 anchorIndex
    );

    /**
     * @notice Emitted when a remote router is enrolled
     */
    event RemoteRouterEnrolled(uint32 indexed domain, bytes32 router);

    /**
     * @notice Emitted when ISM is set
     */
    event InterchainSecurityModuleSet(address indexed module);

    // =========================================================================
    // Errors
    // =========================================================================

    error InvalidMailbox();
    error InvalidRemoteRouter(uint32 domain, bytes32 sender);
    error InvalidMessageFormat();
    error AnchorAlreadyExists(bytes32 dataHash);
    error InsufficientPayment(uint256 required, uint256 provided);

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Initialize the SentinelRouter
     * @param _mailbox Hyperlane Mailbox address
     */
    constructor(address _mailbox) Ownable(msg.sender) {
        if (_mailbox == address(0)) revert InvalidMailbox();
        mailbox = IMailbox(_mailbox);
    }

    // =========================================================================
    // External Functions - Sending
    // =========================================================================

    /**
     * @notice Send an anchor to a remote chain
     * @param destinationDomain Target chain domain ID
     * @param dataHash SHA-256 hash of the anchored data
     * @param ipfsCid IPFS CID where data is stored
     * @param anchorIndex Index of the anchor on source chain
     * @return messageId Hyperlane message ID
     */
    function sendAnchor(
        uint32 destinationDomain,
        bytes32 dataHash,
        string calldata ipfsCid,
        uint256 anchorIndex
    ) external payable nonReentrant returns (bytes32 messageId) {
        bytes32 remoteRouter = remoteRouters[destinationDomain];
        if (remoteRouter == bytes32(0)) {
            revert InvalidRemoteRouter(destinationDomain, bytes32(0));
        }

        // Encode anchor message
        bytes memory messageBody = abi.encode(
            dataHash,
            ipfsCid,
            anchorIndex,
            block.timestamp
        );

        // Dispatch via Hyperlane
        messageId = mailbox.dispatch{value: msg.value}(
            destinationDomain,
            remoteRouter,
            messageBody
        );

        emit AnchorSent(messageId, destinationDomain, dataHash, ipfsCid);

        return messageId;
    }

    /**
     * @notice Send anchor to multiple chains
     * @param destinations Array of destination domains
     * @param dataHash SHA-256 hash of the anchored data
     * @param ipfsCid IPFS CID where data is stored
     * @param anchorIndex Index of the anchor on source chain
     * @return messageIds Array of Hyperlane message IDs
     */
    function broadcastAnchor(
        uint32[] calldata destinations,
        bytes32 dataHash,
        string calldata ipfsCid,
        uint256 anchorIndex
    ) external payable nonReentrant returns (bytes32[] memory messageIds) {
        messageIds = new bytes32[](destinations.length);
        uint256 valuePerMessage = msg.value / destinations.length;

        for (uint256 i = 0; i < destinations.length; i++) {
            bytes32 remoteRouter = remoteRouters[destinations[i]];
            if (remoteRouter == bytes32(0)) continue;

            bytes memory messageBody = abi.encode(
                dataHash,
                ipfsCid,
                anchorIndex,
                block.timestamp
            );

            messageIds[i] = mailbox.dispatch{value: valuePerMessage}(
                destinations[i],
                remoteRouter,
                messageBody
            );

            emit AnchorSent(messageIds[i], destinations[i], dataHash, ipfsCid);
        }

        return messageIds;
    }

    // =========================================================================
    // External Functions - Receiving (IMessageRecipient)
    // =========================================================================

    /**
     * @notice Handle incoming Hyperlane message
     * @dev Called by the Mailbox contract
     * @param _origin Origin domain ID
     * @param _sender Sender address (bytes32)
     * @param _body Message body
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _body
    ) external payable override {
        // Verify caller is mailbox
        if (msg.sender != address(mailbox)) {
            revert InvalidMailbox();
        }

        // Verify sender is enrolled router
        if (remoteRouters[_origin] != _sender) {
            revert InvalidRemoteRouter(_origin, _sender);
        }

        // Decode message
        (
            bytes32 dataHash,
            string memory ipfsCid,
            uint256 anchorIndex,
            uint256 originalTimestamp
        ) = abi.decode(_body, (bytes32, string, uint256, uint256));

        // Check if anchor already exists
        if (remoteAnchors[dataHash].receivedAt != 0) {
            revert AnchorAlreadyExists(dataHash);
        }

        // Store remote anchor
        remoteAnchors[dataHash] = RemoteAnchor({
            originDomain: _origin,
            sender: _sender,
            dataHash: dataHash,
            ipfsCid: ipfsCid,
            anchorIndex: anchorIndex,
            originalTimestamp: originalTimestamp,
            receivedAt: block.timestamp,
            verified: true
        });

        anchorHashes.push(dataHash);
        anchorCount++;

        emit AnchorReceived(_origin, dataHash, ipfsCid, anchorIndex);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /**
     * @notice Get remote anchor by data hash
     * @param dataHash Hash to look up
     * @return anchor The remote anchor data
     */
    function getRemoteAnchor(
        bytes32 dataHash
    ) external view returns (RemoteAnchor memory) {
        return remoteAnchors[dataHash];
    }

    /**
     * @notice Check if anchor exists from remote chain
     * @param dataHash Hash to check
     * @return exists Whether the anchor exists
     */
    function hasRemoteAnchor(bytes32 dataHash) external view returns (bool) {
        return remoteAnchors[dataHash].receivedAt != 0;
    }

    /**
     * @notice Get all anchor hashes (paginated)
     * @param offset Starting index
     * @param limit Maximum number to return
     * @return hashes Array of anchor hashes
     */
    function getAnchorHashes(
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory) {
        if (offset >= anchorCount) {
            return new bytes32[](0);
        }

        uint256 end = offset + limit;
        if (end > anchorCount) {
            end = anchorCount;
        }

        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = anchorHashes[i];
        }

        return result;
    }

    /**
     * @notice Get the ISM for this contract
     * @return The ISM address
     */
    function interchainSecurityModule() 
        external 
        view 
        returns (IInterchainSecurityModule) 
    {
        return interchainSecurityModule;
    }

    /**
     * @notice Quote gas payment for cross-chain message
     * @param destinationDomain Target domain
     * @return quote Estimated gas payment in wei
     */
    function quoteDispatch(
        uint32 destinationDomain,
        bytes32 dataHash,
        string calldata ipfsCid,
        uint256 anchorIndex
    ) external view returns (uint256) {
        bytes32 remoteRouter = remoteRouters[destinationDomain];
        bytes memory messageBody = abi.encode(
            dataHash,
            ipfsCid,
            anchorIndex,
            block.timestamp
        );

        return mailbox.quoteDispatch(destinationDomain, remoteRouter, messageBody);
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    /**
     * @notice Enroll a remote router
     * @param domain Remote domain ID
     * @param router Remote router address (as bytes32)
     */
    function enrollRemoteRouter(
        uint32 domain,
        bytes32 router
    ) external onlyOwner {
        remoteRouters[domain] = router;
        emit RemoteRouterEnrolled(domain, router);
    }

    /**
     * @notice Batch enroll remote routers
     * @param domains Array of domain IDs
     * @param routers Array of router addresses
     */
    function enrollRemoteRouters(
        uint32[] calldata domains,
        bytes32[] calldata routers
    ) external onlyOwner {
        require(domains.length == routers.length, "Length mismatch");

        for (uint256 i = 0; i < domains.length; i++) {
            remoteRouters[domains[i]] = routers[i];
            emit RemoteRouterEnrolled(domains[i], routers[i]);
        }
    }

    /**
     * @notice Set custom ISM
     * @param _ism ISM address
     */
    function setInterchainSecurityModule(address _ism) external onlyOwner {
        interchainSecurityModule = IInterchainSecurityModule(_ism);
        emit InterchainSecurityModuleSet(_ism);
    }

    /**
     * @notice Set local anchor contract reference
     * @param _localAnchor DataAnchor contract address
     */
    function setLocalAnchorContract(address _localAnchor) external onlyOwner {
        localAnchorContract = _localAnchor;
    }

    /**
     * @notice Withdraw stuck funds
     */
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}
