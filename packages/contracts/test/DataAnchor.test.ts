import { expect } from "chai";
import { ethers } from "hardhat";
import { DataAnchor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DataAnchor", function () {
  let dataAnchor: DataAnchor;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Sample test data
  const samplePayloadHash = ethers.keccak256(ethers.toUtf8Bytes("test-payload-1"));
  const sampleIpfsCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const DataAnchorFactory = await ethers.getContractFactory("DataAnchor");
    dataAnchor = await DataAnchorFactory.deploy(false); // No authorization required
    await dataAnchor.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await dataAnchor.owner()).to.equal(owner.address);
    });

    it("Should authorize owner by default", async function () {
      expect(await dataAnchor.authorizedSubmitters(owner.address)).to.be.true;
    });

    it("Should not require authorization by default when deployed with false", async function () {
      expect(await dataAnchor.requireAuthorization()).to.be.false;
    });

    it("Should start with zero anchors", async function () {
      expect(await dataAnchor.anchorCount()).to.equal(0);
    });
  });

  describe("Anchoring", function () {
    it("Should create an anchor successfully", async function () {
      const tx = await dataAnchor.anchor(samplePayloadHash, sampleIpfsCid);
      await tx.wait();

      expect(await dataAnchor.anchorCount()).to.equal(1);
    });

    it("Should emit Anchored event", async function () {
      await expect(dataAnchor.anchor(samplePayloadHash, sampleIpfsCid))
        .to.emit(dataAnchor, "Anchored")
        .withArgs(samplePayloadHash, sampleIpfsCid, owner.address);
    });

    it("Should return the anchor index", async function () {
      const result = await dataAnchor.anchor.staticCall(samplePayloadHash, sampleIpfsCid);
      expect(result).to.equal(0); // First anchor has index 0
    });

    it("Should allow any user to anchor when authorization not required", async function () {
      const userHash = ethers.keccak256(ethers.toUtf8Bytes("user-payload"));
      await expect(dataAnchor.connect(user1).anchor(userHash, sampleIpfsCid))
        .to.emit(dataAnchor, "Anchored")
        .withArgs(userHash, sampleIpfsCid, user1.address);
    });

    it("Should reject duplicate payload hash", async function () {
      await dataAnchor.anchor(samplePayloadHash, sampleIpfsCid);

      await expect(dataAnchor.anchor(samplePayloadHash, "different-cid"))
        .to.be.revertedWithCustomError(dataAnchor, "AnchorAlreadyExists")
        .withArgs(samplePayloadHash);
    });

    it("Should reject zero payload hash", async function () {
      await expect(dataAnchor.anchor(ethers.ZeroHash, sampleIpfsCid))
        .to.be.revertedWithCustomError(dataAnchor, "InvalidPayloadHash");
    });

    it("Should reject empty IPFS CID", async function () {
      await expect(dataAnchor.anchor(samplePayloadHash, ""))
        .to.be.revertedWithCustomError(dataAnchor, "InvalidIpfsCid");
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      await dataAnchor.anchor(samplePayloadHash, sampleIpfsCid);
    });

    it("Should verify existing anchor", async function () {
      const [exists, timestamp, submitter] = await dataAnchor.verify(samplePayloadHash);

      expect(exists).to.be.true;
      expect(timestamp).to.be.gt(0);
      expect(submitter).to.equal(owner.address);
    });

    it("Should return false for non-existent anchor", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      const [exists, timestamp, submitter] = await dataAnchor.verify(unknownHash);

      expect(exists).to.be.false;
      expect(timestamp).to.equal(0);
      expect(submitter).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Get Anchor", function () {
    beforeEach(async function () {
      await dataAnchor.anchor(samplePayloadHash, sampleIpfsCid);
    });

    it("Should return anchor details", async function () {
      const anchor = await dataAnchor.getAnchor(samplePayloadHash);

      expect(anchor.payloadHash).to.equal(samplePayloadHash);
      expect(anchor.ipfsCid).to.equal(sampleIpfsCid);
      expect(anchor.submitter).to.equal(owner.address);
      expect(anchor.timestamp).to.be.gt(0);
    });

    it("Should revert for non-existent anchor", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(dataAnchor.getAnchor(unknownHash))
        .to.be.revertedWithCustomError(dataAnchor, "AnchorNotFound");
    });

    it("Should get anchor by index", async function () {
      const anchor = await dataAnchor.getAnchorByIndex(0);

      expect(anchor.payloadHash).to.equal(samplePayloadHash);
      expect(anchor.ipfsCid).to.equal(sampleIpfsCid);
    });

    it("Should revert for invalid index", async function () {
      await expect(dataAnchor.getAnchorByIndex(999))
        .to.be.revertedWithCustomError(dataAnchor, "AnchorNotFound");
    });
  });

  describe("Pagination", function () {
    beforeEach(async function () {
      // Create 5 anchors
      for (let i = 0; i < 5; i++) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`payload-${i}`));
        await dataAnchor.anchor(hash, `cid-${i}`);
      }
    });

    it("Should return paginated hashes", async function () {
      const hashes = await dataAnchor.getAnchorHashes(0, 3);
      expect(hashes.length).to.equal(3);
    });

    it("Should handle offset correctly", async function () {
      const hashes = await dataAnchor.getAnchorHashes(2, 10);
      expect(hashes.length).to.equal(3); // Only 3 remaining after offset 2
    });

    it("Should return empty array for offset beyond count", async function () {
      const hashes = await dataAnchor.getAnchorHashes(100, 10);
      expect(hashes.length).to.equal(0);
    });
  });

  describe("Authorization", function () {
    let authorizedAnchor: DataAnchor;

    beforeEach(async function () {
      const DataAnchorFactory = await ethers.getContractFactory("DataAnchor");
      authorizedAnchor = await DataAnchorFactory.deploy(true); // Authorization required
      await authorizedAnchor.waitForDeployment();
    });

    it("Should require authorization when enabled", async function () {
      const userHash = ethers.keccak256(ethers.toUtf8Bytes("user-payload"));

      await expect(authorizedAnchor.connect(user1).anchor(userHash, sampleIpfsCid))
        .to.be.revertedWithCustomError(authorizedAnchor, "NotAuthorized")
        .withArgs(user1.address);
    });

    it("Should allow owner to authorize submitters", async function () {
      await authorizedAnchor.setAuthorizedSubmitter(user1.address, true);
      expect(await authorizedAnchor.authorizedSubmitters(user1.address)).to.be.true;
    });

    it("Should allow authorized submitter to anchor", async function () {
      await authorizedAnchor.setAuthorizedSubmitter(user1.address, true);

      const userHash = ethers.keccak256(ethers.toUtf8Bytes("user-payload"));
      await expect(authorizedAnchor.connect(user1).anchor(userHash, sampleIpfsCid))
        .to.emit(authorizedAnchor, "Anchored");
    });

    it("Should emit SubmitterAuthorized event", async function () {
      await expect(authorizedAnchor.setAuthorizedSubmitter(user1.address, true))
        .to.emit(authorizedAnchor, "SubmitterAuthorized")
        .withArgs(user1.address, true);
    });

    it("Should allow batch authorization", async function () {
      await authorizedAnchor.batchAuthorizeSubmitters([user1.address, user2.address]);

      expect(await authorizedAnchor.authorizedSubmitters(user1.address)).to.be.true;
      expect(await authorizedAnchor.authorizedSubmitters(user2.address)).to.be.true;
    });

    it("Should allow owner to change authorization requirement", async function () {
      await authorizedAnchor.setRequireAuthorization(false);
      expect(await authorizedAnchor.requireAuthorization()).to.be.false;
    });

    it("Should emit AuthorizationRequirementChanged event", async function () {
      await expect(authorizedAnchor.setRequireAuthorization(false))
        .to.emit(authorizedAnchor, "AuthorizationRequirementChanged")
        .withArgs(false);
    });

    it("Should only allow owner to authorize", async function () {
      await expect(authorizedAnchor.connect(user1).setAuthorizedSubmitter(user2.address, true))
        .to.be.revertedWithCustomError(authorizedAnchor, "OwnableUnauthorizedAccount");
    });
  });

  describe("isAuthorized", function () {
    it("Should return true for anyone when authorization not required", async function () {
      expect(await dataAnchor.isAuthorized(user1.address)).to.be.true;
    });

    it("Should return false for unauthorized when authorization required", async function () {
      const DataAnchorFactory = await ethers.getContractFactory("DataAnchor");
      const authorizedAnchor = await DataAnchorFactory.deploy(true);
      await authorizedAnchor.waitForDeployment();

      expect(await authorizedAnchor.isAuthorized(user1.address)).to.be.false;
      expect(await authorizedAnchor.isAuthorized(owner.address)).to.be.true;
    });
  });
});
