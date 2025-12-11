import { expect } from "chai";
import { ethers } from "hardhat";
import { SensorAsset, SimpleMarketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleMarketplace", function () {
  let sensorAsset: SensorAsset;
  let marketplace: SimpleMarketplace;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const platformFeeBps = 250; // 2.5%
  const minListingPrice = ethers.parseEther("0.001");
  const listingPrice = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient] = await ethers.getSigners();

    // Deploy SensorAsset
    const SensorAssetFactory = await ethers.getContractFactory("SensorAsset");
    sensorAsset = await SensorAssetFactory.deploy("Test NFT", "TNFT", "ipfs://");
    await sensorAsset.waitForDeployment();

    // Deploy Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("SimpleMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      platformFeeBps,
      minListingPrice,
      feeRecipient.address
    );
    await marketplace.waitForDeployment();

    // Mint NFTs to seller
    await sensorAsset.mint(seller.address, "token-uri-1");
    await sensorAsset.mint(seller.address, "token-uri-2");
    await sensorAsset.mint(seller.address, "token-uri-3");

    // Approve marketplace
    await sensorAsset.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
  });

  describe("Deployment", function () {
    it("Should set correct platform fee", async function () {
      expect(await marketplace.platformFeeBps()).to.equal(platformFeeBps);
    });

    it("Should set correct minimum listing price", async function () {
      expect(await marketplace.minListingPrice()).to.equal(minListingPrice);
    });

    it("Should set correct fee recipient", async function () {
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should start with zero listings", async function () {
      expect(await marketplace.totalListings()).to.equal(0);
    });

    it("Should reject fee above maximum", async function () {
      const MarketplaceFactory = await ethers.getContractFactory("SimpleMarketplace");
      await expect(
        MarketplaceFactory.deploy(1500, minListingPrice, feeRecipient.address) // 15% > 10% max
      ).to.be.revertedWithCustomError(marketplace, "FeeTooHigh");
    });

    it("Should reject zero address fee recipient", async function () {
      const MarketplaceFactory = await ethers.getContractFactory("SimpleMarketplace");
      await expect(
        MarketplaceFactory.deploy(platformFeeBps, minListingPrice, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(marketplace, "InvalidFeeRecipient");
    });
  });

  describe("Creating Listings", function () {
    it("Should create a listing successfully", async function () {
      const tx = await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );
      await tx.wait();

      expect(await marketplace.totalListings()).to.equal(1);
    });

    it("Should transfer NFT to marketplace", async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );

      expect(await sensorAsset.ownerOf(1)).to.equal(await marketplace.getAddress());
    });

    it("Should emit ListingCreated event", async function () {
      await expect(
        marketplace.connect(seller).createListing(
          await sensorAsset.getAddress(),
          1,
          listingPrice
        )
      )
        .to.emit(marketplace, "ListingCreated")
        .withArgs(1, await sensorAsset.getAddress(), 1, seller.address, listingPrice);
    });

    it("Should store listing data correctly", async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );

      const listing = await marketplace.getListing(1);
      expect(listing.nftContract).to.equal(await sensorAsset.getAddress());
      expect(listing.tokenId).to.equal(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(listingPrice);
      expect(listing.status).to.equal(0); // Active
    });

    it("Should reject price below minimum", async function () {
      await expect(
        marketplace.connect(seller).createListing(
          await sensorAsset.getAddress(),
          1,
          ethers.parseEther("0.0001") // Below minimum
        )
      ).to.be.revertedWithCustomError(marketplace, "PriceBelowMinimum");
    });

    it("Should reject duplicate listing", async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );

      // Try to list again (would fail anyway since NFT is transferred)
      await expect(
        marketplace.connect(seller).createListing(
          await sensorAsset.getAddress(),
          1,
          listingPrice
        )
      ).to.be.reverted;
    });

    it("Should reject listing from non-owner", async function () {
      await expect(
        marketplace.connect(buyer).createListing(
          await sensorAsset.getAddress(),
          1,
          listingPrice
        )
      ).to.be.revertedWithCustomError(marketplace, "NotTokenOwner");
    });
  });

  describe("Cancelling Listings", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );
    });

    it("Should cancel listing successfully", async function () {
      await marketplace.connect(seller).cancelListing(1);

      const listing = await marketplace.getListing(1);
      expect(listing.status).to.equal(2); // Cancelled
    });

    it("Should return NFT to seller", async function () {
      await marketplace.connect(seller).cancelListing(1);

      expect(await sensorAsset.ownerOf(1)).to.equal(seller.address);
    });

    it("Should emit ListingCancelled event", async function () {
      await expect(marketplace.connect(seller).cancelListing(1))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(1);
    });

    it("Should reject cancellation from non-seller", async function () {
      await expect(marketplace.connect(buyer).cancelListing(1))
        .to.be.revertedWithCustomError(marketplace, "NotListingSeller");
    });

    it("Should reject cancellation of non-existent listing", async function () {
      await expect(marketplace.connect(seller).cancelListing(999))
        .to.be.revertedWithCustomError(marketplace, "ListingNotFound");
    });

    it("Should reject double cancellation", async function () {
      await marketplace.connect(seller).cancelListing(1);

      await expect(marketplace.connect(seller).cancelListing(1))
        .to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });
  });

  describe("Buying", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );
    });

    it("Should complete purchase successfully", async function () {
      await marketplace.connect(buyer).buy(1, { value: listingPrice });

      expect(await sensorAsset.ownerOf(1)).to.equal(buyer.address);
    });

    it("Should update listing status to Sold", async function () {
      await marketplace.connect(buyer).buy(1, { value: listingPrice });

      const listing = await marketplace.getListing(1);
      expect(listing.status).to.equal(1); // Sold
    });

    it("Should emit ListingSold event", async function () {
      const expectedFee = (listingPrice * BigInt(platformFeeBps)) / 10000n;

      await expect(marketplace.connect(buyer).buy(1, { value: listingPrice }))
        .to.emit(marketplace, "ListingSold")
        .withArgs(1, buyer.address, listingPrice, expectedFee);
    });

    it("Should transfer correct amounts", async function () {
      const expectedFee = (listingPrice * BigInt(platformFeeBps)) / 10000n;
      const expectedSellerProceeds = listingPrice - expectedFee;

      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      await marketplace.connect(buyer).buy(1, { value: listingPrice });

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerProceeds);
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("Should update volume and fees tracking", async function () {
      await marketplace.connect(buyer).buy(1, { value: listingPrice });

      const expectedFee = (listingPrice * BigInt(platformFeeBps)) / 10000n;

      expect(await marketplace.totalVolume()).to.equal(listingPrice);
      expect(await marketplace.totalFeesCollected()).to.equal(expectedFee);
    });

    it("Should reject insufficient payment", async function () {
      await expect(
        marketplace.connect(buyer).buy(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(marketplace, "InsufficientPayment");
    });

    it("Should refund excess payment", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      const excessPayment = ethers.parseEther("2.0");

      const tx = await marketplace.connect(buyer).buy(1, { value: excessPayment });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      const actualSpent = buyerBalanceBefore - buyerBalanceAfter - gasUsed;

      // Should only have spent the listing price (plus gas)
      expect(actualSpent).to.be.closeTo(listingPrice, ethers.parseEther("0.001"));
    });

    it("Should reject buying non-existent listing", async function () {
      await expect(marketplace.connect(buyer).buy(999, { value: listingPrice }))
        .to.be.revertedWithCustomError(marketplace, "ListingNotFound");
    });

    it("Should reject buying inactive listing", async function () {
      await marketplace.connect(seller).cancelListing(1);

      await expect(marketplace.connect(buyer).buy(1, { value: listingPrice }))
        .to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });
  });

  describe("Price Updates", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );
    });

    it("Should update price successfully", async function () {
      const newPrice = ethers.parseEther("2.0");
      await marketplace.connect(seller).updatePrice(1, newPrice);

      const listing = await marketplace.getListing(1);
      expect(listing.price).to.equal(newPrice);
    });

    it("Should reject price update from non-seller", async function () {
      await expect(marketplace.connect(buyer).updatePrice(1, ethers.parseEther("2.0")))
        .to.be.revertedWithCustomError(marketplace, "NotListingSeller");
    });

    it("Should reject price below minimum", async function () {
      await expect(marketplace.connect(seller).updatePrice(1, ethers.parseEther("0.0001")))
        .to.be.revertedWithCustomError(marketplace, "PriceBelowMinimum");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );
    });

    it("Should return active listing ID", async function () {
      const listingId = await marketplace.getActiveListingId(
        await sensorAsset.getAddress(),
        1
      );
      expect(listingId).to.equal(1);
    });

    it("Should check if token is listed", async function () {
      expect(await marketplace.isListed(await sensorAsset.getAddress(), 1)).to.be.true;
      expect(await marketplace.isListed(await sensorAsset.getAddress(), 2)).to.be.false;
    });

    it("Should calculate fee correctly", async function () {
      const fee = await marketplace.calculateFee(ethers.parseEther("10.0"));
      expect(fee).to.equal(ethers.parseEther("0.25")); // 2.5% of 10
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      await marketplace.setPlatformFee(500); // 5%
      expect(await marketplace.platformFeeBps()).to.equal(500);
    });

    it("Should emit PlatformFeeUpdated event", async function () {
      await expect(marketplace.setPlatformFee(500))
        .to.emit(marketplace, "PlatformFeeUpdated")
        .withArgs(250, 500);
    });

    it("Should reject fee above maximum", async function () {
      await expect(marketplace.setPlatformFee(1500))
        .to.be.revertedWithCustomError(marketplace, "FeeTooHigh");
    });

    it("Should allow owner to update fee recipient", async function () {
      await marketplace.setFeeRecipient(buyer.address);
      expect(await marketplace.feeRecipient()).to.equal(buyer.address);
    });

    it("Should emit FeeRecipientUpdated event", async function () {
      await expect(marketplace.setFeeRecipient(buyer.address))
        .to.emit(marketplace, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, buyer.address);
    });

    it("Should reject zero address fee recipient", async function () {
      await expect(marketplace.setFeeRecipient(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(marketplace, "InvalidFeeRecipient");
    });

    it("Should allow owner to update minimum listing price", async function () {
      await marketplace.setMinListingPrice(ethers.parseEther("0.01"));
      expect(await marketplace.minListingPrice()).to.equal(ethers.parseEther("0.01"));
    });

    it("Should reject non-owner admin calls", async function () {
      await expect(marketplace.connect(buyer).setPlatformFee(500))
        .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to withdraw stuck NFT", async function () {
      // Create listing to transfer NFT to marketplace
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        listingPrice
      );

      // Emergency withdraw
      await marketplace.emergencyWithdrawNFT(
        await sensorAsset.getAddress(),
        1,
        owner.address
      );

      expect(await sensorAsset.ownerOf(1)).to.equal(owner.address);
    });

    it("Should allow owner to withdraw stuck ETH", async function () {
      // Send ETH directly to marketplace (shouldn't happen in normal operation)
      await owner.sendTransaction({
        to: await marketplace.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await marketplace.emergencyWithdrawETH();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Owner should have received the ETH (minus gas)
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });
  });

  describe("Multiple Listings", function () {
    it("Should handle multiple listings correctly", async function () {
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        1,
        ethers.parseEther("1.0")
      );
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        2,
        ethers.parseEther("2.0")
      );
      await marketplace.connect(seller).createListing(
        await sensorAsset.getAddress(),
        3,
        ethers.parseEther("3.0")
      );

      expect(await marketplace.totalListings()).to.equal(3);

      // Buy the second one
      await marketplace.connect(buyer).buy(2, { value: ethers.parseEther("2.0") });

      // Verify states
      expect((await marketplace.getListing(1)).status).to.equal(0); // Active
      expect((await marketplace.getListing(2)).status).to.equal(1); // Sold
      expect((await marketplace.getListing(3)).status).to.equal(0); // Active
    });
  });
});
