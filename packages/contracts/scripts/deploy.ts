import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Sentinel Grid - Contract Deployment Script
 * 
 * Deploys:
 * 1. DataAnchor - For anchoring IPFS hashes
 * 2. SensorAsset - ERC-721 NFT for infrastructure assets
 * 3. SimpleMarketplace - NFT marketplace
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 */

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: {
    DataAnchor: {
      address: string;
      txHash: string;
    };
    SensorAsset: {
      address: string;
      txHash: string;
    };
    SimpleMarketplace: {
      address: string;
      txHash: string;
    };
  };
}

async function main() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                   ║");
  console.log("║   🛡️  SENTINEL GRID - CONTRACT DEPLOYMENT                         ║");
  console.log("║                                                                   ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const networkInfo = await ethers.provider.getNetwork();

  console.log("Deployment Configuration:");
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log(`  Network:      ${network.name}`);
  console.log(`  Chain ID:     ${networkInfo.chainId}`);
  console.log(`  Deployer:     ${deployer.address}`);
  console.log(`  Balance:      ${ethers.formatEther(balance)} ETH`);
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log("\n");

  // Check balance
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. Deployment may fail.");
  }

  const result: DeploymentResult = {
    network: network.name,
    chainId: Number(networkInfo.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DataAnchor: { address: "", txHash: "" },
      SensorAsset: { address: "", txHash: "" },
      SimpleMarketplace: { address: "", txHash: "" },
    },
  };

  // =========================================================================
  // Deploy DataAnchor
  // =========================================================================
  console.log("1️⃣  Deploying DataAnchor...");

  const DataAnchor = await ethers.getContractFactory("DataAnchor");
  const dataAnchor = await DataAnchor.deploy(
    false // requireAuthorization - false for open access
  );
  await dataAnchor.waitForDeployment();
  const dataAnchorAddress = await dataAnchor.getAddress();
  const dataAnchorTx = dataAnchor.deploymentTransaction();

  console.log(`   ✓ DataAnchor deployed: ${dataAnchorAddress}`);
  console.log(`     Tx: ${dataAnchorTx?.hash}`);
  console.log("");

  result.contracts.DataAnchor = {
    address: dataAnchorAddress,
    txHash: dataAnchorTx?.hash || "",
  };

  // =========================================================================
  // Deploy SensorAsset
  // =========================================================================
  console.log("2️⃣  Deploying SensorAsset NFT...");

  // Base URI for metadata (can be updated later)
  const baseURI = "ipfs://";

  const SensorAsset = await ethers.getContractFactory("SensorAsset");
  const sensorAsset = await SensorAsset.deploy(
    "Sentinel Grid Sensor Asset", // name
    "SGSA",                        // symbol
    baseURI                        // baseURI
  );
  await sensorAsset.waitForDeployment();
  const sensorAssetAddress = await sensorAsset.getAddress();
  const sensorAssetTx = sensorAsset.deploymentTransaction();

  console.log(`   ✓ SensorAsset deployed: ${sensorAssetAddress}`);
  console.log(`     Tx: ${sensorAssetTx?.hash}`);
  console.log("");

  result.contracts.SensorAsset = {
    address: sensorAssetAddress,
    txHash: sensorAssetTx?.hash || "",
  };

  // =========================================================================
  // Deploy SimpleMarketplace
  // =========================================================================
  console.log("3️⃣  Deploying SimpleMarketplace...");

  const platformFeeBps = 250; // 2.5% platform fee
  const minListingPrice = ethers.parseEther("0.001"); // 0.001 ETH minimum

  const SimpleMarketplace = await ethers.getContractFactory("SimpleMarketplace");
  const marketplace = await SimpleMarketplace.deploy(
    platformFeeBps,
    minListingPrice,
    deployer.address // feeRecipient
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  const marketplaceTx = marketplace.deploymentTransaction();

  console.log(`   ✓ SimpleMarketplace deployed: ${marketplaceAddress}`);
  console.log(`     Tx: ${marketplaceTx?.hash}`);
  console.log("");

  result.contracts.SimpleMarketplace = {
    address: marketplaceAddress,
    txHash: marketplaceTx?.hash || "",
  };

  // =========================================================================
  // Post-deployment configuration
  // =========================================================================
  console.log("4️⃣  Post-deployment configuration...");

  // Authorize marketplace as minter for SensorAsset
  const authTx = await sensorAsset.setAuthorizedMinter(marketplaceAddress, true);
  await authTx.wait();
  console.log("   ✓ Marketplace authorized as minter");

  console.log("");

  // =========================================================================
  // Save deployment info
  // =========================================================================
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(result, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentFile}`);

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("                     DEPLOYMENT COMPLETE ✓");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log("  Contract Addresses:");
  console.log(`    DataAnchor:        ${dataAnchorAddress}`);
  console.log(`    SensorAsset:       ${sensorAssetAddress}`);
  console.log(`    SimpleMarketplace: ${marketplaceAddress}`);
  console.log("");
  console.log("  Next Steps:");
  console.log("    1. Update .env with CONTRACT_ADDRESS=" + dataAnchorAddress);
  console.log("    2. Update backend config with contract addresses");
  console.log("    3. Verify contracts on block explorer:");
  console.log(`       npx hardhat verify --network ${network.name} ${dataAnchorAddress} false`);
  console.log(`       npx hardhat verify --network ${network.name} ${sensorAssetAddress} "Sentinel Grid Sensor Asset" "SGSA" "ipfs://"`);
  console.log(`       npx hardhat verify --network ${network.name} ${marketplaceAddress} ${platformFeeBps} ${minListingPrice} ${deployer.address}`);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("\n");

  return result;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
