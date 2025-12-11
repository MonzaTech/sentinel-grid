/**
 * Sentinel Grid Contracts - ABI Exports
 * 
 * Use these ABIs when interacting with deployed contracts from other packages.
 */

// DataAnchor ABI
export const DATA_ANCHOR_ABI = [
  // Write functions
  "function anchor(bytes32 payloadHash, string calldata ipfsCid) external returns (uint256)",
  
  // Read functions
  "function verify(bytes32 payloadHash) external view returns (bool exists, uint256 timestamp, address submitter)",
  "function getAnchor(bytes32 payloadHash) external view returns (tuple(bytes32 payloadHash, string ipfsCid, uint256 timestamp, address submitter))",
  "function getAnchorByIndex(uint256 index) external view returns (tuple(bytes32 payloadHash, string ipfsCid, uint256 timestamp, address submitter))",
  "function getAnchorHashes(uint256 offset, uint256 limit) external view returns (bytes32[])",
  "function anchorCount() external view returns (uint256)",
  "function isAuthorized(address submitter) external view returns (bool)",
  "function requireAuthorization() external view returns (bool)",
  "function authorizedSubmitters(address) external view returns (bool)",
  "function owner() external view returns (address)",
  
  // Admin functions
  "function setAuthorizedSubmitter(address submitter, bool authorized) external",
  "function batchAuthorizeSubmitters(address[] calldata submitters) external",
  "function setRequireAuthorization(bool required) external",
  
  // Events
  "event Anchored(bytes32 indexed payloadHash, string ipfsCid, address indexed submitter)",
  "event SubmitterAuthorized(address indexed submitter, bool authorized)",
  "event AuthorizationRequirementChanged(bool required)",
] as const;

// SensorAsset ABI
export const SENSOR_ASSET_ABI = [
  // ERC721 standard
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external",
  
  // ERC721Enumerable
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenByIndex(uint256 index) external view returns (uint256)",
  
  // SensorAsset specific - Minting
  "function mint(address to, string calldata tokenURI) external returns (uint256)",
  "function mintWithMetadata(address to, string calldata tokenURI, string calldata nodeId, uint8 assetType, string calldata location) external returns (uint256)",
  "function batchMint(address to, string[] calldata tokenURIs) external returns (uint256[])",
  
  // SensorAsset specific - Metadata
  "function getAssetMetadata(uint256 tokenId) external view returns (tuple(uint8 assetType, uint8 status, string nodeId, string location, uint256 registeredAt, uint256 lastUpdated))",
  "function getTokenByNodeId(string calldata nodeId) external view returns (uint256)",
  "function tokensOfOwner(address owner) external view returns (uint256[])",
  "function totalMinted() external view returns (uint256)",
  
  // SensorAsset specific - Updates
  "function updateStatus(uint256 tokenId, uint8 newStatus) external",
  "function updateMetadata(uint256 tokenId, uint8 assetType, string calldata location) external",
  "function updateTokenURI(uint256 tokenId, string calldata tokenURI) external",
  
  // Admin
  "function setAuthorizedMinter(address minter, bool authorized) external",
  "function setBaseURI(string calldata baseURI) external",
  "function authorizedMinters(address) external view returns (bool)",
  "function burn(uint256 tokenId) external",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  "event AssetMinted(uint256 indexed tokenId, address indexed owner, string nodeId, uint8 assetType)",
  "event AssetStatusUpdated(uint256 indexed tokenId, uint8 oldStatus, uint8 newStatus)",
  "event AssetMetadataUpdated(uint256 indexed tokenId)",
  "event MinterAuthorized(address indexed minter, bool authorized)",
] as const;

// SimpleMarketplace ABI
export const SIMPLE_MARKETPLACE_ABI = [
  // Listing functions
  "function createListing(address nftContract, uint256 tokenId, uint256 price) external returns (uint256)",
  "function cancelListing(uint256 listingId) external",
  "function buy(uint256 listingId) external payable",
  "function updatePrice(uint256 listingId, uint256 newPrice) external",
  
  // View functions
  "function getListing(uint256 listingId) external view returns (tuple(address nftContract, uint256 tokenId, address seller, uint256 price, uint8 status, uint256 createdAt, uint256 soldAt))",
  "function getActiveListingId(address nftContract, uint256 tokenId) external view returns (uint256)",
  "function isListed(address nftContract, uint256 tokenId) external view returns (bool)",
  "function calculateFee(uint256 price) external view returns (uint256)",
  "function totalListings() external view returns (uint256)",
  "function platformFeeBps() external view returns (uint256)",
  "function minListingPrice() external view returns (uint256)",
  "function feeRecipient() external view returns (address)",
  "function totalVolume() external view returns (uint256)",
  "function totalFeesCollected() external view returns (uint256)",
  
  // Admin functions
  "function setPlatformFee(uint256 newFeeBps) external",
  "function setFeeRecipient(address newRecipient) external",
  "function setMinListingPrice(uint256 newMinPrice) external",
  "function emergencyWithdrawNFT(address nftContract, uint256 tokenId, address to) external",
  "function emergencyWithdrawETH() external",
  
  // Events
  "event ListingCreated(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price)",
  "event ListingCancelled(uint256 indexed listingId)",
  "event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 fee)",
  "event PlatformFeeUpdated(uint256 oldFee, uint256 newFee)",
  "event FeeRecipientUpdated(address oldRecipient, address newRecipient)",
] as const;

// Asset types enum
export enum AssetType {
  PowerGrid = 0,
  Telecom = 1,
  WaterTreatment = 2,
  DataCenter = 3,
  Transportation = 4,
  Industrial = 5,
  Other = 6,
}

// Asset status enum
export enum AssetStatus {
  Active = 0,
  Warning = 1,
  Critical = 2,
  Offline = 3,
  Maintenance = 4,
}

// Listing status enum
export enum ListingStatus {
  Active = 0,
  Sold = 1,
  Cancelled = 2,
}

// Chain configurations
export const CHAINS = {
  local: {
    name: "Local Hardhat",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
  },
  base: {
    name: "Base Mainnet",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
  },
  optimismSepolia: {
    name: "Optimism Sepolia",
    chainId: 11155420,
    rpcUrl: "https://sepolia.optimism.io",
    explorer: "https://sepolia-optimism.etherscan.io",
  },
  optimism: {
    name: "Optimism Mainnet",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
  },
} as const;
