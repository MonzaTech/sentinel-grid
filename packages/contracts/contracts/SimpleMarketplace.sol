// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleMarketplace
 * @author Sentinel Grid (Monza Tech LLC)
 * @notice Simple NFT marketplace for trading SensorAsset tokens
 * @dev Supports fixed-price listings with platform fees
 * 
 * Features:
 * - Create fixed-price listings
 * - Cancel listings
 * - Buy listed NFTs
 * - Platform fee collection
 * - Supports any ERC-721 token
 */
contract SimpleMarketplace is ERC721Holder, Ownable, ReentrancyGuard {
    // =========================================================================
    // Types
    // =========================================================================

    /**
     * @notice Listing status
     */
    enum ListingStatus {
        Active,    // 0: Available for purchase
        Sold,      // 1: Has been purchased
        Cancelled  // 2: Cancelled by seller
    }

    /**
     * @notice Represents a marketplace listing
     */
    struct Listing {
        address nftContract;     // NFT contract address
        uint256 tokenId;         // Token ID
        address seller;          // Seller address
        uint256 price;           // Price in wei
        ListingStatus status;    // Listing status
        uint256 createdAt;       // When listing was created
        uint256 soldAt;          // When listing was sold (0 if not sold)
    }

    // =========================================================================
    // State
    // =========================================================================

    /// @notice Listing counter
    uint256 private _nextListingId;

    /// @notice Mapping from listing ID to listing data
    mapping(uint256 => Listing) private _listings;

    /// @notice Mapping from NFT contract + tokenId to listing ID
    mapping(address => mapping(uint256 => uint256)) private _activeListings;

    /// @notice Platform fee in basis points (100 = 1%)
    uint256 public platformFeeBps;

    /// @notice Maximum platform fee (10%)
    uint256 public constant MAX_FEE_BPS = 1000;

    /// @notice Minimum listing price
    uint256 public minListingPrice;

    /// @notice Fee recipient address
    address public feeRecipient;

    /// @notice Total volume traded
    uint256 public totalVolume;

    /// @notice Total fees collected
    uint256 public totalFeesCollected;

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Emitted when a new listing is created
     */
    event ListingCreated(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    /**
     * @notice Emitted when a listing is cancelled
     */
    event ListingCancelled(uint256 indexed listingId);

    /**
     * @notice Emitted when a listing is sold
     */
    event ListingSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price,
        uint256 fee
    );

    /**
     * @notice Emitted when platform fee is updated
     */
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @notice Emitted when fee recipient is updated
     */
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    // =========================================================================
    // Errors
    // =========================================================================

    error ListingNotFound(uint256 listingId);
    error ListingNotActive(uint256 listingId);
    error NotListingSeller(uint256 listingId, address caller);
    error PriceBelowMinimum(uint256 price, uint256 minimum);
    error InsufficientPayment(uint256 sent, uint256 required);
    error TokenAlreadyListed(address nftContract, uint256 tokenId);
    error NotTokenOwner(address nftContract, uint256 tokenId);
    error InvalidFeeRecipient();
    error FeeTooHigh(uint256 fee, uint256 maximum);
    error TransferFailed();

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Initialize the marketplace
     * @param _platformFeeBps Platform fee in basis points
     * @param _minListingPrice Minimum listing price in wei
     * @param _feeRecipient Address to receive fees
     */
    constructor(
        uint256 _platformFeeBps,
        uint256 _minListingPrice,
        address _feeRecipient
    ) Ownable(msg.sender) {
        if (_platformFeeBps > MAX_FEE_BPS) {
            revert FeeTooHigh(_platformFeeBps, MAX_FEE_BPS);
        }
        if (_feeRecipient == address(0)) {
            revert InvalidFeeRecipient();
        }

        platformFeeBps = _platformFeeBps;
        minListingPrice = _minListingPrice;
        feeRecipient = _feeRecipient;
        _nextListingId = 1;
    }

    // =========================================================================
    // External Functions - Listings
    // =========================================================================

    /**
     * @notice Create a new listing
     * @param nftContract NFT contract address
     * @param tokenId Token ID to list
     * @param price Price in wei
     * @return listingId The ID of the new listing
     */
    function createListing(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256 listingId) {
        // Validate price
        if (price < minListingPrice) {
            revert PriceBelowMinimum(price, minListingPrice);
        }

        // Check not already listed
        if (_activeListings[nftContract][tokenId] != 0) {
            revert TokenAlreadyListed(nftContract, tokenId);
        }

        // Verify ownership
        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner(nftContract, tokenId);
        }

        // Transfer NFT to marketplace
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        // Create listing
        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            status: ListingStatus.Active,
            createdAt: block.timestamp,
            soldAt: 0
        });

        _activeListings[nftContract][tokenId] = listingId;

        emit ListingCreated(listingId, nftContract, tokenId, msg.sender, price);

        return listingId;
    }

    /**
     * @notice Cancel a listing
     * @param listingId Listing ID to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];

        if (listing.seller == address(0)) {
            revert ListingNotFound(listingId);
        }
        if (listing.status != ListingStatus.Active) {
            revert ListingNotActive(listingId);
        }
        if (listing.seller != msg.sender) {
            revert NotListingSeller(listingId, msg.sender);
        }

        // Update status
        listing.status = ListingStatus.Cancelled;
        delete _activeListings[listing.nftContract][listing.tokenId];

        // Return NFT to seller
        IERC721(listing.nftContract).safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId
        );

        emit ListingCancelled(listingId);
    }

    /**
     * @notice Buy a listed NFT
     * @param listingId Listing ID to buy
     */
    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage listing = _listings[listingId];

        if (listing.seller == address(0)) {
            revert ListingNotFound(listingId);
        }
        if (listing.status != ListingStatus.Active) {
            revert ListingNotActive(listingId);
        }
        if (msg.value < listing.price) {
            revert InsufficientPayment(msg.value, listing.price);
        }

        // Calculate fee
        uint256 fee = (listing.price * platformFeeBps) / 10000;
        uint256 sellerProceeds = listing.price - fee;

        // Update listing
        listing.status = ListingStatus.Sold;
        listing.soldAt = block.timestamp;
        delete _activeListings[listing.nftContract][listing.tokenId];

        // Update stats
        totalVolume += listing.price;
        totalFeesCollected += fee;

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );

        // Transfer funds
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            if (!feeSuccess) revert TransferFailed();
        }

        (bool sellerSuccess, ) = listing.seller.call{value: sellerProceeds}("");
        if (!sellerSuccess) revert TransferFailed();

        // Refund excess payment
        if (msg.value > listing.price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - listing.price}("");
            if (!refundSuccess) revert TransferFailed();
        }

        emit ListingSold(listingId, msg.sender, listing.price, fee);
    }

    /**
     * @notice Update listing price
     * @param listingId Listing ID to update
     * @param newPrice New price in wei
     */
    function updatePrice(uint256 listingId, uint256 newPrice) external {
        Listing storage listing = _listings[listingId];

        if (listing.seller == address(0)) {
            revert ListingNotFound(listingId);
        }
        if (listing.status != ListingStatus.Active) {
            revert ListingNotActive(listingId);
        }
        if (listing.seller != msg.sender) {
            revert NotListingSeller(listingId, msg.sender);
        }
        if (newPrice < minListingPrice) {
            revert PriceBelowMinimum(newPrice, minListingPrice);
        }

        listing.price = newPrice;

        emit ListingCreated(
            listingId,
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            newPrice
        );
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /**
     * @notice Get listing details
     * @param listingId Listing ID to query
     * @return listing The listing data
     */
    function getListing(
        uint256 listingId
    ) external view returns (Listing memory listing) {
        return _listings[listingId];
    }

    /**
     * @notice Get active listing for a token
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @return listingId The listing ID (0 if not listed)
     */
    function getActiveListingId(
        address nftContract,
        uint256 tokenId
    ) external view returns (uint256) {
        return _activeListings[nftContract][tokenId];
    }

    /**
     * @notice Check if a token is listed
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @return isListed Whether the token is actively listed
     */
    function isListed(
        address nftContract,
        uint256 tokenId
    ) external view returns (bool) {
        uint256 listingId = _activeListings[nftContract][tokenId];
        return listingId != 0 && _listings[listingId].status == ListingStatus.Active;
    }

    /**
     * @notice Calculate fee for a given price
     * @param price Sale price in wei
     * @return fee Platform fee amount
     */
    function calculateFee(uint256 price) external view returns (uint256) {
        return (price * platformFeeBps) / 10000;
    }

    /**
     * @notice Get total number of listings
     */
    function totalListings() external view returns (uint256) {
        return _nextListingId - 1;
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    /**
     * @notice Update platform fee
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) {
            revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        }

        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;

        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) {
            revert InvalidFeeRecipient();
        }

        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Update minimum listing price
     * @param newMinPrice New minimum price in wei
     */
    function setMinListingPrice(uint256 newMinPrice) external onlyOwner {
        minListingPrice = newMinPrice;
    }

    /**
     * @notice Emergency withdraw stuck NFT
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param to Recipient address
     */
    function emergencyWithdrawNFT(
        address nftContract,
        uint256 tokenId,
        address to
    ) external onlyOwner {
        IERC721(nftContract).safeTransferFrom(address(this), to, tokenId);
    }

    /**
     * @notice Emergency withdraw stuck ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }
}
