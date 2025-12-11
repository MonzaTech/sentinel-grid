import { expect } from "chai";
import { ethers } from "hardhat";
import { SensorAsset } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SensorAsset", function () {
  let sensorAsset: SensorAsset;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const tokenName = "Sentinel Grid Sensor Asset";
  const tokenSymbol = "SGSA";
  const baseURI = "ipfs://";
  const sampleTokenURI = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

    const SensorAssetFactory = await ethers.getContractFactory("SensorAsset");
    sensorAsset = await SensorAssetFactory.deploy(tokenName, tokenSymbol, baseURI);
    await sensorAsset.waitForDeployment();

    // Authorize minter
    await sensorAsset.setAuthorizedMinter(minter.address, true);
  });

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      expect(await sensorAsset.name()).to.equal(tokenName);
      expect(await sensorAsset.symbol()).to.equal(tokenSymbol);
    });

    it("Should set owner as authorized minter", async function () {
      expect(await sensorAsset.authorizedMinters(owner.address)).to.be.true;
    });

    it("Should start with zero tokens", async function () {
      expect(await sensorAsset.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint a token successfully", async function () {
      await sensorAsset.connect(minter).mint(user1.address, sampleTokenURI);

      expect(await sensorAsset.totalSupply()).to.equal(1);
      expect(await sensorAsset.ownerOf(1)).to.equal(user1.address);
    });

    it("Should return correct tokenId", async function () {
      const tokenId = await sensorAsset.connect(minter).mint.staticCall(user1.address, sampleTokenURI);
      expect(tokenId).to.equal(1);
    });

    it("Should emit Transfer event", async function () {
      await expect(sensorAsset.connect(minter).mint(user1.address, sampleTokenURI))
        .to.emit(sensorAsset, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, 1);
    });

    it("Should emit AssetMinted event", async function () {
      await expect(sensorAsset.connect(minter).mint(user1.address, sampleTokenURI))
        .to.emit(sensorAsset, "AssetMinted")
        .withArgs(1, user1.address, "", 6); // AssetType.Other = 6
    });

    it("Should set correct tokenURI", async function () {
      await sensorAsset.connect(minter).mint(user1.address, sampleTokenURI);
      expect(await sensorAsset.tokenURI(1)).to.equal(sampleTokenURI);
    });

    it("Should reject minting from unauthorized address", async function () {
      await expect(sensorAsset.connect(user1).mint(user2.address, sampleTokenURI))
        .to.be.revertedWithCustomError(sensorAsset, "NotAuthorizedMinter");
    });

    it("Should increment token IDs", async function () {
      await sensorAsset.connect(minter).mint(user1.address, "uri1");
      await sensorAsset.connect(minter).mint(user1.address, "uri2");
      await sensorAsset.connect(minter).mint(user2.address, "uri3");

      expect(await sensorAsset.totalSupply()).to.equal(3);
      expect(await sensorAsset.ownerOf(1)).to.equal(user1.address);
      expect(await sensorAsset.ownerOf(2)).to.equal(user1.address);
      expect(await sensorAsset.ownerOf(3)).to.equal(user2.address);
    });
  });

  describe("Minting with Metadata", function () {
    const nodeId = "node-power-001";
    const location = "Miami, FL";
    const assetType = 0; // PowerGrid

    it("Should mint with full metadata", async function () {
      await sensorAsset.connect(minter).mintWithMetadata(
        user1.address,
        sampleTokenURI,
        nodeId,
        assetType,
        location
      );

      const metadata = await sensorAsset.getAssetMetadata(1);
      expect(metadata.nodeId).to.equal(nodeId);
      expect(metadata.location).to.equal(location);
      expect(metadata.assetType).to.equal(assetType);
      expect(metadata.status).to.equal(0); // Active
    });

    it("Should map nodeId to tokenId", async function () {
      await sensorAsset.connect(minter).mintWithMetadata(
        user1.address,
        sampleTokenURI,
        nodeId,
        assetType,
        location
      );

      expect(await sensorAsset.getTokenByNodeId(nodeId)).to.equal(1);
    });

    it("Should reject duplicate nodeId", async function () {
      await sensorAsset.connect(minter).mintWithMetadata(
        user1.address,
        sampleTokenURI,
        nodeId,
        assetType,
        location
      );

      await expect(
        sensorAsset.connect(minter).mintWithMetadata(
          user2.address,
          "different-uri",
          nodeId, // Same nodeId
          assetType,
          location
        )
      ).to.be.revertedWithCustomError(sensorAsset, "NodeIdAlreadyRegistered");
    });

    it("Should reject empty nodeId", async function () {
      await expect(
        sensorAsset.connect(minter).mintWithMetadata(
          user1.address,
          sampleTokenURI,
          "", // Empty nodeId
          assetType,
          location
        )
      ).to.be.revertedWithCustomError(sensorAsset, "InvalidNodeId");
    });
  });

  describe("Batch Minting", function () {
    it("Should mint multiple tokens", async function () {
      const uris = ["uri1", "uri2", "uri3"];
      const tokenIds = await sensorAsset.connect(minter).batchMint.staticCall(user1.address, uris);

      expect(tokenIds.length).to.equal(3);
      expect(tokenIds[0]).to.equal(1);
      expect(tokenIds[1]).to.equal(2);
      expect(tokenIds[2]).to.equal(3);
    });

    it("Should emit events for each minted token", async function () {
      const uris = ["uri1", "uri2"];
      const tx = await sensorAsset.connect(minter).batchMint(user1.address, uris);
      const receipt = await tx.wait();

      // Check that AssetMinted events were emitted
      const mintEvents = receipt?.logs.filter(
        (log) => log.topics[0] === sensorAsset.interface.getEvent("AssetMinted").topicHash
      );
      expect(mintEvents?.length).to.equal(2);
    });
  });

  describe("Status Updates", function () {
    beforeEach(async function () {
      await sensorAsset.connect(minter).mint(user1.address, sampleTokenURI);
    });

    it("Should update status", async function () {
      await sensorAsset.connect(minter).updateStatus(1, 2); // Critical

      const metadata = await sensorAsset.getAssetMetadata(1);
      expect(metadata.status).to.equal(2);
    });

    it("Should emit AssetStatusUpdated event", async function () {
      await expect(sensorAsset.connect(minter).updateStatus(1, 1)) // Warning
        .to.emit(sensorAsset, "AssetStatusUpdated")
        .withArgs(1, 0, 1); // oldStatus: Active (0), newStatus: Warning (1)
    });

    it("Should update lastUpdated timestamp", async function () {
      const metadataBefore = await sensorAsset.getAssetMetadata(1);
      
      // Wait a bit to ensure timestamp changes
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine", []);

      await sensorAsset.connect(minter).updateStatus(1, 1);

      const metadataAfter = await sensorAsset.getAssetMetadata(1);
      expect(metadataAfter.lastUpdated).to.be.gte(metadataBefore.lastUpdated);
    });

    it("Should reject status update for non-existent token", async function () {
      await expect(sensorAsset.connect(minter).updateStatus(999, 1))
        .to.be.revertedWithCustomError(sensorAsset, "TokenDoesNotExist");
    });
  });

  describe("Metadata Updates", function () {
    beforeEach(async function () {
      await sensorAsset.connect(minter).mint(user1.address, sampleTokenURI);
    });

    it("Should update asset type and location", async function () {
      await sensorAsset.connect(minter).updateMetadata(1, 1, "New York, NY"); // Telecom

      const metadata = await sensorAsset.getAssetMetadata(1);
      expect(metadata.assetType).to.equal(1);
      expect(metadata.location).to.equal("New York, NY");
    });

    it("Should update tokenURI", async function () {
      const newURI = "ipfs://new-cid";
      await sensorAsset.connect(minter).updateTokenURI(1, newURI);

      expect(await sensorAsset.tokenURI(1)).to.equal(newURI);
    });
  });

  describe("Token Enumeration", function () {
    beforeEach(async function () {
      await sensorAsset.connect(minter).mint(user1.address, "uri1");
      await sensorAsset.connect(minter).mint(user1.address, "uri2");
      await sensorAsset.connect(minter).mint(user2.address, "uri3");
    });

    it("Should return tokens of owner", async function () {
      const tokens = await sensorAsset.tokensOfOwner(user1.address);
      expect(tokens.length).to.equal(2);
      expect(tokens[0]).to.equal(1);
      expect(tokens[1]).to.equal(2);
    });

    it("Should return total minted", async function () {
      expect(await sensorAsset.totalMinted()).to.equal(3);
    });

    it("Should return token by index", async function () {
      expect(await sensorAsset.tokenOfOwnerByIndex(user1.address, 0)).to.equal(1);
      expect(await sensorAsset.tokenOfOwnerByIndex(user1.address, 1)).to.equal(2);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await sensorAsset.connect(minter).mint(user1.address, sampleTokenURI);
    });

    it("Should allow owner to burn", async function () {
      await sensorAsset.connect(user1).burn(1);
      expect(await sensorAsset.totalSupply()).to.equal(0);
    });

    it("Should not allow non-owner to burn", async function () {
      await expect(sensorAsset.connect(user2).burn(1))
        .to.be.revertedWithCustomError(sensorAsset, "ERC721InsufficientApproval");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await sensorAsset.connect(minter).mint(user1.address, sampleTokenURI);
    });

    it("Should allow owner to transfer", async function () {
      await sensorAsset.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await sensorAsset.ownerOf(1)).to.equal(user2.address);
    });

    it("Should allow approved address to transfer", async function () {
      await sensorAsset.connect(user1).approve(user2.address, 1);
      await sensorAsset.connect(user2).transferFrom(user1.address, user2.address, 1);
      expect(await sensorAsset.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to authorize minters", async function () {
      await sensorAsset.setAuthorizedMinter(user1.address, true);
      expect(await sensorAsset.authorizedMinters(user1.address)).to.be.true;
    });

    it("Should emit MinterAuthorized event", async function () {
      await expect(sensorAsset.setAuthorizedMinter(user1.address, true))
        .to.emit(sensorAsset, "MinterAuthorized")
        .withArgs(user1.address, true);
    });

    it("Should allow owner to set base URI", async function () {
      await sensorAsset.setBaseURI("https://api.sentinelgrid.io/metadata/");
      // Note: This only affects tokens that use the default tokenURI behavior
    });

    it("Should reject non-owner admin calls", async function () {
      await expect(sensorAsset.connect(user1).setAuthorizedMinter(user2.address, true))
        .to.be.revertedWithCustomError(sensorAsset, "OwnableUnauthorizedAccount");
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721", async function () {
      expect(await sensorAsset.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Metadata", async function () {
      expect(await sensorAsset.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("Should support ERC721Enumerable", async function () {
      expect(await sensorAsset.supportsInterface("0x780e9d63")).to.be.true;
    });
  });
});
