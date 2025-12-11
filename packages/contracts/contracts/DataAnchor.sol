// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DataAnchor
 * @author Sentinel Grid (Monza Tech LLC)
 * @notice Immutable on-chain anchoring of IPFS content hashes for audit trails
 * @dev Stores SHA-256 payload hashes with IPFS CIDs for regulatory compliance
 * 
 * Use cases:
 * - Infrastructure state snapshots
 * - Prediction audit trails
 * - Mitigation action logs
 * - Compliance evidence
 */
contract DataAnchor is Ownable, ReentrancyGuard {
    // =========================================================================
    // Types
    // =========================================================================

    /**
     * @notice Represents an anchored data record
     * @param payloadHash SHA-256 hash of the original payload
     * @param ipfsCid IPFS Content Identifier where payload is stored
     * @param timestamp Block timestamp when anchor was created
     * @param submitter Address that submitted the anchor
     */
    struct Anchor {
        bytes32 payloadHash;
        string ipfsCid;
        uint256 timestamp;
        address submitter;
    }

    // =========================================================================
    // State
    // =========================================================================

    /// @notice Mapping from payload hash to anchor data
    mapping(bytes32 => Anchor) private _anchors;

    /// @notice List of all payload hashes (for enumeration)
    bytes32[] private _anchorHashes;

    /// @notice Mapping to track authorized submitters
    mapping(address => bool) public authorizedSubmitters;

    /// @notice Whether authorization is required to submit anchors
    bool public requireAuthorization;

    /// @notice Total number of anchors
    uint256 public anchorCount;

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Emitted when a new anchor is created
     * @param payloadHash SHA-256 hash of the anchored payload
     * @param ipfsCid IPFS CID where the payload is stored
     * @param submitter Address that created the anchor
     */
    event Anchored(
        bytes32 indexed payloadHash,
        string ipfsCid,
        address indexed submitter
    );

    /**
     * @notice Emitted when a submitter is authorized or deauthorized
     * @param submitter Address of the submitter
     * @param authorized Whether they are now authorized
     */
    event SubmitterAuthorized(address indexed submitter, bool authorized);

    /**
     * @notice Emitted when authorization requirement changes
     * @param required Whether authorization is now required
     */
    event AuthorizationRequirementChanged(bool required);

    // =========================================================================
    // Errors
    // =========================================================================

    /// @notice Thrown when anchor already exists for this hash
    error AnchorAlreadyExists(bytes32 payloadHash);

    /// @notice Thrown when anchor does not exist
    error AnchorNotFound(bytes32 payloadHash);

    /// @notice Thrown when payload hash is zero
    error InvalidPayloadHash();

    /// @notice Thrown when IPFS CID is empty
    error InvalidIpfsCid();

    /// @notice Thrown when caller is not authorized
    error NotAuthorized(address caller);

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Initialize the DataAnchor contract
     * @param _requireAuthorization Whether to require authorization for submissions
     */
    constructor(bool _requireAuthorization) Ownable(msg.sender) {
        requireAuthorization = _requireAuthorization;
        // Owner is always authorized
        authorizedSubmitters[msg.sender] = true;
    }

    // =========================================================================
    // Modifiers
    // =========================================================================

    /**
     * @notice Ensure caller is authorized to submit anchors
     */
    modifier onlyAuthorized() {
        if (requireAuthorization && !authorizedSubmitters[msg.sender]) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    // =========================================================================
    // External Functions
    // =========================================================================

    /**
     * @notice Anchor a payload hash with its IPFS CID
     * @param payloadHash SHA-256 hash of the payload (must be unique)
     * @param ipfsCid IPFS Content Identifier where payload is stored
     * @return anchorIndex Index of the new anchor
     */
    function anchor(
        bytes32 payloadHash,
        string calldata ipfsCid
    ) external onlyAuthorized nonReentrant returns (uint256 anchorIndex) {
        // Validate inputs
        if (payloadHash == bytes32(0)) {
            revert InvalidPayloadHash();
        }
        if (bytes(ipfsCid).length == 0) {
            revert InvalidIpfsCid();
        }

        // Check if anchor already exists
        if (_anchors[payloadHash].timestamp != 0) {
            revert AnchorAlreadyExists(payloadHash);
        }

        // Create anchor
        _anchors[payloadHash] = Anchor({
            payloadHash: payloadHash,
            ipfsCid: ipfsCid,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        // Add to list
        _anchorHashes.push(payloadHash);
        anchorIndex = anchorCount;
        anchorCount++;

        emit Anchored(payloadHash, ipfsCid, msg.sender);

        return anchorIndex;
    }

    /**
     * @notice Verify if an anchor exists for a given payload hash
     * @param payloadHash SHA-256 hash to verify
     * @return exists Whether the anchor exists
     * @return timestamp When the anchor was created (0 if not exists)
     * @return submitter Who created the anchor (address(0) if not exists)
     */
    function verify(
        bytes32 payloadHash
    ) external view returns (bool exists, uint256 timestamp, address submitter) {
        Anchor storage a = _anchors[payloadHash];
        if (a.timestamp == 0) {
            return (false, 0, address(0));
        }
        return (true, a.timestamp, a.submitter);
    }

    /**
     * @notice Get full anchor details
     * @param payloadHash SHA-256 hash to look up
     * @return anchor The anchor data
     */
    function getAnchor(
        bytes32 payloadHash
    ) external view returns (Anchor memory anchor) {
        Anchor storage a = _anchors[payloadHash];
        if (a.timestamp == 0) {
            revert AnchorNotFound(payloadHash);
        }
        return a;
    }

    /**
     * @notice Get anchor by index
     * @param index Index of the anchor
     * @return anchor The anchor data
     */
    function getAnchorByIndex(
        uint256 index
    ) external view returns (Anchor memory anchor) {
        if (index >= anchorCount) {
            revert AnchorNotFound(bytes32(index));
        }
        bytes32 hash = _anchorHashes[index];
        return _anchors[hash];
    }

    /**
     * @notice Get all anchor hashes (paginated)
     * @param offset Starting index
     * @param limit Maximum number of hashes to return
     * @return hashes Array of payload hashes
     */
    function getAnchorHashes(
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory hashes) {
        if (offset >= anchorCount) {
            return new bytes32[](0);
        }

        uint256 end = offset + limit;
        if (end > anchorCount) {
            end = anchorCount;
        }

        hashes = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            hashes[i - offset] = _anchorHashes[i];
        }

        return hashes;
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    /**
     * @notice Authorize or deauthorize a submitter
     * @param submitter Address to modify
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedSubmitter(
        address submitter,
        bool authorized
    ) external onlyOwner {
        authorizedSubmitters[submitter] = authorized;
        emit SubmitterAuthorized(submitter, authorized);
    }

    /**
     * @notice Batch authorize submitters
     * @param submitters Array of addresses to authorize
     */
    function batchAuthorizeSubmitters(
        address[] calldata submitters
    ) external onlyOwner {
        for (uint256 i = 0; i < submitters.length; i++) {
            authorizedSubmitters[submitters[i]] = true;
            emit SubmitterAuthorized(submitters[i], true);
        }
    }

    /**
     * @notice Set whether authorization is required
     * @param required Whether to require authorization
     */
    function setRequireAuthorization(bool required) external onlyOwner {
        requireAuthorization = required;
        emit AuthorizationRequirementChanged(required);
    }

    /**
     * @notice Check if an address is authorized
     * @param submitter Address to check
     * @return isAuthorized Whether the address is authorized
     */
    function isAuthorized(address submitter) external view returns (bool) {
        if (!requireAuthorization) return true;
        return authorizedSubmitters[submitter];
    }
}
