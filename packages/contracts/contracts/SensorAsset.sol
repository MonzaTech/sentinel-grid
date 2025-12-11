// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SensorAsset
 * @author Sentinel Grid (Monza Tech LLC)
 * @notice ERC-721 NFT representing infrastructure sensor/node assets
 * @dev Each token represents ownership/access rights to a monitored infrastructure node
 * 
 * Features:
 * - Mintable by authorized minters
 * - Burnable by token owners
 * - Enumerable for easy listing
 * - URI storage for metadata (IPFS)
 * - Asset type classification
 * - Status tracking
 */
contract SensorAsset is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Enumerable, 
    ERC721Burnable, 
    Ownable, 
    ReentrancyGuard 
{
    // =========================================================================
    // Types
    // =========================================================================

    /**
     * @notice Asset type classification
     */
    enum AssetType {
        PowerGrid,      // 0: Power grid node
        Telecom,        // 1: Telecommunications
        WaterTreatment, // 2: Water treatment facility
        DataCenter,     // 3: Data center
        Transportation, // 4: Transportation infrastructure
        Industrial,     // 5: Industrial facility
        Other           // 6: Other infrastructure
    }

    /**
     * @notice Asset operational status
     */
    enum AssetStatus {
        Active,      // 0: Fully operational
        Warning,     // 1: Operational with warnings
        Critical,    // 2: Critical condition
        Offline,     // 3: Not operational
        Maintenance  // 4: Under maintenance
    }

    /**
     * @notice Metadata for each sensor asset
     */
    struct AssetMetadata {
        AssetType assetType;
        AssetStatus status;
        string nodeId;           // External node identifier
        string location;         // Geographic location
        uint256 registeredAt;    // When the asset was registered
        uint256 lastUpdated;     // Last metadata update
    }

    // =========================================================================
    // State
    // =========================================================================

    /// @notice Counter for token IDs
    uint256 private _nextTokenId;

    /// @notice Mapping from token ID to asset metadata
    mapping(uint256 => AssetMetadata) private _assetMetadata;

    /// @notice Mapping from node ID to token ID
    mapping(string => uint256) private _nodeIdToToken;

    /// @notice Authorized minters
    mapping(address => bool) public authorizedMinters;

    /// @notice Base URI for token metadata
    string private _baseTokenURI;

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Emitted when a new asset is minted
     */
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string nodeId,
        AssetType assetType
    );

    /**
     * @notice Emitted when asset status is updated
     */
    event AssetStatusUpdated(
        uint256 indexed tokenId,
        AssetStatus oldStatus,
        AssetStatus newStatus
    );

    /**
     * @notice Emitted when asset metadata is updated
     */
    event AssetMetadataUpdated(uint256 indexed tokenId);

    /**
     * @notice Emitted when minter authorization changes
     */
    event MinterAuthorized(address indexed minter, bool authorized);

    // =========================================================================
    // Errors
    // =========================================================================

    error NotAuthorizedMinter(address caller);
    error NodeIdAlreadyRegistered(string nodeId);
    error TokenDoesNotExist(uint256 tokenId);
    error InvalidNodeId();

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Initialize the SensorAsset NFT contract
     * @param name Token name
     * @param symbol Token symbol
     * @param baseURI Base URI for token metadata
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        authorizedMinters[msg.sender] = true;
        _nextTokenId = 1; // Start from 1
    }

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyMinter() {
        if (!authorizedMinters[msg.sender]) {
            revert NotAuthorizedMinter(msg.sender);
        }
        _;
    }

    // =========================================================================
    // External Functions - Minting
    // =========================================================================

    /**
     * @notice Mint a new sensor asset NFT
     * @param to Address to mint to
     * @param tokenURI_ Metadata URI (IPFS)
     * @return tokenId The ID of the newly minted token
     */
    function mint(
        address to,
        string calldata tokenURI_
    ) external onlyMinter nonReentrant returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _assetMetadata[tokenId] = AssetMetadata({
            assetType: AssetType.Other,
            status: AssetStatus.Active,
            nodeId: "",
            location: "",
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        emit AssetMinted(tokenId, to, "", AssetType.Other);

        return tokenId;
    }

    /**
     * @notice Mint a new sensor asset with full metadata
     * @param to Address to mint to
     * @param tokenURI_ Metadata URI (IPFS)
     * @param nodeId External node identifier
     * @param assetType Type of infrastructure asset
     * @param location Geographic location
     * @return tokenId The ID of the newly minted token
     */
    function mintWithMetadata(
        address to,
        string calldata tokenURI_,
        string calldata nodeId,
        AssetType assetType,
        string calldata location
    ) external onlyMinter nonReentrant returns (uint256 tokenId) {
        if (bytes(nodeId).length == 0) {
            revert InvalidNodeId();
        }
        if (_nodeIdToToken[nodeId] != 0) {
            revert NodeIdAlreadyRegistered(nodeId);
        }

        tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _assetMetadata[tokenId] = AssetMetadata({
            assetType: assetType,
            status: AssetStatus.Active,
            nodeId: nodeId,
            location: location,
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        _nodeIdToToken[nodeId] = tokenId;

        emit AssetMinted(tokenId, to, nodeId, assetType);

        return tokenId;
    }

    /**
     * @notice Batch mint multiple assets
     * @param to Address to mint to
     * @param tokenURIs Array of metadata URIs
     * @return tokenIds Array of minted token IDs
     */
    function batchMint(
        address to,
        string[] calldata tokenURIs
    ) external onlyMinter nonReentrant returns (uint256[] memory tokenIds) {
        tokenIds = new uint256[](tokenURIs.length);

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);

            _assetMetadata[tokenId] = AssetMetadata({
                assetType: AssetType.Other,
                status: AssetStatus.Active,
                nodeId: "",
                location: "",
                registeredAt: block.timestamp,
                lastUpdated: block.timestamp
            });

            tokenIds[i] = tokenId;
            emit AssetMinted(tokenId, to, "", AssetType.Other);
        }

        return tokenIds;
    }

    // =========================================================================
    // External Functions - Metadata Management
    // =========================================================================

    /**
     * @notice Update asset status
     * @param tokenId Token ID to update
     * @param newStatus New status
     */
    function updateStatus(
        uint256 tokenId,
        AssetStatus newStatus
    ) external onlyMinter {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist(tokenId);
        }

        AssetStatus oldStatus = _assetMetadata[tokenId].status;
        _assetMetadata[tokenId].status = newStatus;
        _assetMetadata[tokenId].lastUpdated = block.timestamp;

        emit AssetStatusUpdated(tokenId, oldStatus, newStatus);
    }

    /**
     * @notice Update asset metadata
     * @param tokenId Token ID to update
     * @param assetType New asset type
     * @param location New location
     */
    function updateMetadata(
        uint256 tokenId,
        AssetType assetType,
        string calldata location
    ) external onlyMinter {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist(tokenId);
        }

        _assetMetadata[tokenId].assetType = assetType;
        _assetMetadata[tokenId].location = location;
        _assetMetadata[tokenId].lastUpdated = block.timestamp;

        emit AssetMetadataUpdated(tokenId);
    }

    /**
     * @notice Update token URI
     * @param tokenId Token ID to update
     * @param tokenURI_ New metadata URI
     */
    function updateTokenURI(
        uint256 tokenId,
        string calldata tokenURI_
    ) external onlyMinter {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist(tokenId);
        }

        _setTokenURI(tokenId, tokenURI_);
        _assetMetadata[tokenId].lastUpdated = block.timestamp;

        emit AssetMetadataUpdated(tokenId);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /**
     * @notice Get asset metadata
     * @param tokenId Token ID to query
     * @return metadata The asset metadata
     */
    function getAssetMetadata(
        uint256 tokenId
    ) external view returns (AssetMetadata memory metadata) {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist(tokenId);
        }
        return _assetMetadata[tokenId];
    }

    /**
     * @notice Get token ID by node ID
     * @param nodeId External node identifier
     * @return tokenId The token ID (0 if not found)
     */
    function getTokenByNodeId(
        string calldata nodeId
    ) external view returns (uint256) {
        return _nodeIdToToken[nodeId];
    }

    /**
     * @notice Get all tokens owned by an address
     * @param owner Address to query
     * @return tokenIds Array of token IDs
     */
    function tokensOfOwner(
        address owner
    ) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(owner);
        tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @notice Get total supply
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    /**
     * @notice Authorize or deauthorize a minter
     * @param minter Address to modify
     * @param authorized Whether to authorize
     */
    function setAuthorizedMinter(
        address minter,
        bool authorized
    ) external onlyOwner {
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }

    /**
     * @notice Set base URI
     * @param baseURI New base URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // =========================================================================
    // Overrides
    // =========================================================================

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
