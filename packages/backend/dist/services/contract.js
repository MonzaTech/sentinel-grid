"use strict";
/**
 * Sentinel Grid Backend - Contract Service
 * Ethers.js integration for on-chain anchoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
exports.getContract = getContract;
exports.initializeContract = initializeContract;
const ethers_1 = require("ethers");
const config_js_1 = require("../config.js");
// ============================================================================
// ABI Stubs (updated when contracts are deployed)
// ============================================================================
// DataAnchor contract ABI (minimal interface)
const DATA_ANCHOR_ABI = [
    'function anchor(bytes32 payloadHash, string calldata ipfsCid) external returns (uint256)',
    'function verify(bytes32 payloadHash) external view returns (bool exists, uint256 timestamp, address submitter)',
    'function getAnchor(bytes32 payloadHash) external view returns (tuple(bytes32 payloadHash, string ipfsCid, uint256 timestamp, address submitter))',
    'event Anchored(bytes32 indexed payloadHash, string ipfsCid, address indexed submitter)',
];
// SensorAsset NFT contract ABI (minimal interface)
const SENSOR_ASSET_ABI = [
    'function mint(address to, string calldata tokenURI) external returns (uint256)',
    'function tokenURI(uint256 tokenId) external view returns (string)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];
// ============================================================================
// Chain Configurations
// ============================================================================
const CHAINS = {
    local: {
        name: 'Local Hardhat',
        rpcUrl: config_js_1.config.chain.hardhatRpc,
        chainId: 31337,
        dataAnchorAddress: config_js_1.config.chain.contractAddress,
        sensorAssetAddress: undefined,
    },
    base: {
        name: 'Base Sepolia',
        rpcUrl: config_js_1.config.chain.baseRpc || 'https://sepolia.base.org',
        chainId: 84532,
        dataAnchorAddress: undefined, // Set after deployment
        sensorAssetAddress: undefined,
    },
    optimism: {
        name: 'Optimism Sepolia',
        rpcUrl: 'https://sepolia.optimism.io',
        chainId: 11155420,
        dataAnchorAddress: undefined,
        sensorAssetAddress: undefined,
    },
};
// ============================================================================
// Contract Service
// ============================================================================
class ContractService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.currentChain = null;
    }
    /**
     * Connect to a chain
     */
    async connect(chainName = 'local') {
        const chainConfig = CHAINS[chainName];
        if (!chainConfig) {
            throw new Error(`Unknown chain: ${chainName}. Available: ${Object.keys(CHAINS).join(', ')}`);
        }
        this.currentChain = chainConfig;
        this.provider = new ethers_1.ethers.JsonRpcProvider(chainConfig.rpcUrl);
        // Only create signer if we have a private key
        if (config_js_1.config.chain.privateKey) {
            this.signer = new ethers_1.ethers.Wallet(config_js_1.config.chain.privateKey, this.provider);
        }
        // Verify connection
        try {
            const network = await this.provider.getNetwork();
            console.log(`✓ Connected to ${chainConfig.name} (chainId: ${network.chainId})`);
        }
        catch (error) {
            console.warn(`⚠ Could not verify connection to ${chainConfig.name}`);
        }
    }
    /**
     * Get connection status
     */
    isConnected() {
        return this.provider !== null;
    }
    /**
     * Get signer address
     */
    getAddress() {
        return this.signer?.address ?? null;
    }
    /**
     * Get current chain info
     */
    getChain() {
        return this.currentChain;
    }
    /**
     * Get ETH balance
     */
    async getBalance() {
        if (!this.signer || !this.provider) {
            throw new Error('Not connected');
        }
        const balance = await this.provider.getBalance(this.signer.address);
        return ethers_1.ethers.formatEther(balance);
    }
    // ==========================================================================
    // DataAnchor Contract Methods
    // ==========================================================================
    /**
     * Submit anchor to blockchain
     */
    async anchor(payloadHash, ipfsCid) {
        if (!this.signer || !this.currentChain?.dataAnchorAddress) {
            throw new Error('Not connected or contract not configured');
        }
        const contract = new ethers_1.ethers.Contract(this.currentChain.dataAnchorAddress, DATA_ANCHOR_ABI, this.signer);
        // Ensure payloadHash is bytes32
        const hash32 = payloadHash.startsWith('0x')
            ? payloadHash
            : `0x${payloadHash}`;
        const tx = await contract.anchor(hash32, ipfsCid);
        const receipt = await tx.wait();
        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            payloadHash: hash32,
            ipfsCid,
            timestamp: new Date(),
            gasUsed: receipt.gasUsed.toString(),
        };
    }
    /**
     * Verify anchor exists on-chain
     */
    async verify(payloadHash) {
        if (!this.provider || !this.currentChain?.dataAnchorAddress) {
            throw new Error('Not connected or contract not configured');
        }
        const contract = new ethers_1.ethers.Contract(this.currentChain.dataAnchorAddress, DATA_ANCHOR_ABI, this.provider);
        const hash32 = payloadHash.startsWith('0x')
            ? payloadHash
            : `0x${payloadHash}`;
        try {
            const [exists, timestamp, submitter] = await contract.verify(hash32);
            return {
                exists,
                timestamp: exists ? new Date(Number(timestamp) * 1000) : null,
                submitter: exists ? submitter : null,
            };
        }
        catch {
            return { exists: false, timestamp: null, submitter: null };
        }
    }
    /**
     * Get anchor details
     */
    async getAnchor(payloadHash) {
        if (!this.provider || !this.currentChain?.dataAnchorAddress) {
            throw new Error('Not connected or contract not configured');
        }
        const contract = new ethers_1.ethers.Contract(this.currentChain.dataAnchorAddress, DATA_ANCHOR_ABI, this.provider);
        const hash32 = payloadHash.startsWith('0x')
            ? payloadHash
            : `0x${payloadHash}`;
        try {
            const anchor = await contract.getAnchor(hash32);
            return {
                payloadHash: anchor.payloadHash,
                ipfsCid: anchor.ipfsCid,
                timestamp: new Date(Number(anchor.timestamp) * 1000),
                submitter: anchor.submitter,
            };
        }
        catch {
            return null;
        }
    }
    // ==========================================================================
    // SensorAsset NFT Contract Methods
    // ==========================================================================
    /**
     * Mint a sensor asset NFT
     */
    async mintSensorAsset(to, tokenURI) {
        if (!this.signer || !this.currentChain?.sensorAssetAddress) {
            throw new Error('Not connected or NFT contract not configured');
        }
        const contract = new ethers_1.ethers.Contract(this.currentChain.sensorAssetAddress, SENSOR_ASSET_ABI, this.signer);
        const tx = await contract.mint(to, tokenURI);
        const receipt = await tx.wait();
        // Parse Transfer event to get tokenId
        const transferEvent = receipt.logs
            .map((log) => {
            try {
                return contract.interface.parseLog(log);
            }
            catch {
                return null;
            }
        })
            .find((event) => event?.name === 'Transfer');
        const tokenId = transferEvent?.args?.tokenId?.toString() ?? '0';
        return {
            txHash: receipt.hash,
            tokenId,
            owner: to,
            tokenURI,
        };
    }
    /**
     * Get NFT token URI
     */
    async getTokenURI(tokenId) {
        if (!this.provider || !this.currentChain?.sensorAssetAddress) {
            throw new Error('Not connected or NFT contract not configured');
        }
        const contract = new ethers_1.ethers.Contract(this.currentChain.sensorAssetAddress, SENSOR_ASSET_ABI, this.provider);
        return await contract.tokenURI(tokenId);
    }
    // ==========================================================================
    // Utility Methods
    // ==========================================================================
    /**
     * Wait for transaction confirmation
     */
    async waitForTx(txHash, confirmations = 1) {
        if (!this.provider) {
            throw new Error('Not connected');
        }
        return await this.provider.waitForTransaction(txHash, confirmations);
    }
    /**
     * Estimate gas for anchor transaction
     */
    async estimateAnchorGas(payloadHash, ipfsCid) {
        if (!this.signer || !this.currentChain?.dataAnchorAddress) {
            throw new Error('Not connected or contract not configured');
        }
        const contract = new ethers_1.ethers.Contract(this.currentChain.dataAnchorAddress, DATA_ANCHOR_ABI, this.signer);
        const hash32 = payloadHash.startsWith('0x')
            ? payloadHash
            : `0x${payloadHash}`;
        const gasEstimate = await contract.anchor.estimateGas(hash32, ipfsCid);
        return gasEstimate.toString();
    }
    /**
     * Get current gas price
     */
    async getGasPrice() {
        if (!this.provider) {
            throw new Error('Not connected');
        }
        const feeData = await this.provider.getFeeData();
        return ethers_1.ethers.formatUnits(feeData.gasPrice ?? 0n, 'gwei');
    }
    /**
     * Disconnect from chain
     */
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.currentChain = null;
    }
}
exports.ContractService = ContractService;
// ============================================================================
// Singleton Instance
// ============================================================================
let contractInstance = null;
function getContract() {
    if (!contractInstance) {
        contractInstance = new ContractService();
    }
    return contractInstance;
}
/**
 * Initialize contract service (call on startup)
 */
async function initializeContract(chain = 'local') {
    const service = getContract();
    await service.connect(chain);
    return service;
}
//# sourceMappingURL=contract.js.map