"use strict";
/**
 * Sentinel Grid Cross-Chain Bridge Service
 *
 * Hyperlane integration for multi-chain data anchoring and messaging.
 * Enables cross-chain verification and synchronization of infrastructure data.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockBridgeService = exports.BridgeService = exports.DEFAULT_CHAINS = exports.MessageStatus = exports.ChainId = void 0;
exports.createTestnetBridge = createTestnetBridge;
exports.createMockBridge = createMockBridge;
const ethers_1 = require("ethers");
// ============================================================================
// Types
// ============================================================================
/**
 * Supported chains for cross-chain messaging
 */
var ChainId;
(function (ChainId) {
    // Mainnets
    ChainId[ChainId["Ethereum"] = 1] = "Ethereum";
    ChainId[ChainId["Optimism"] = 10] = "Optimism";
    ChainId[ChainId["Base"] = 8453] = "Base";
    ChainId[ChainId["Arbitrum"] = 42161] = "Arbitrum";
    ChainId[ChainId["Polygon"] = 137] = "Polygon";
    // Testnets
    ChainId[ChainId["Sepolia"] = 11155111] = "Sepolia";
    ChainId[ChainId["OptimismSepolia"] = 11155420] = "OptimismSepolia";
    ChainId[ChainId["BaseSepolia"] = 84532] = "BaseSepolia";
    ChainId[ChainId["ArbitrumSepolia"] = 421614] = "ArbitrumSepolia";
})(ChainId || (exports.ChainId = ChainId = {}));
/**
 * Message status
 */
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["Pending"] = "pending";
    MessageStatus["Dispatched"] = "dispatched";
    MessageStatus["Delivered"] = "delivered";
    MessageStatus["Failed"] = "failed";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
// ============================================================================
// Constants
// ============================================================================
/**
 * Hyperlane contract ABIs
 */
const MAILBOX_ABI = [
    'function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32)',
    'function process(bytes calldata metadata, bytes calldata message) external',
    'function delivered(bytes32 messageId) external view returns (bool)',
    'function localDomain() external view returns (uint32)',
    'function defaultIsm() external view returns (address)',
    'function recipientIsm(address recipient) external view returns (address)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes message)',
    'event Process(uint32 indexed origin, bytes32 indexed sender, address indexed recipient)',
];
const IGP_ABI = [
    'function payForGas(bytes32 messageId, uint32 destinationDomain, uint256 gasAmount, address refundAddress) external payable',
    'function quoteGasPayment(uint32 destinationDomain, uint256 gasAmount) external view returns (uint256)',
    'function getExchangeRateAndGasPrice(uint32 destinationDomain) external view returns (uint128 tokenExchangeRate, uint128 gasPrice)',
];
const SENTINEL_ROUTER_ABI = [
    'function sendAnchor(uint32 destinationDomain, bytes32 dataHash, string calldata ipfsCid, uint256 anchorIndex) external payable returns (bytes32)',
    'function handleAnchor(uint32 origin, bytes32 sender, bytes32 dataHash, string calldata ipfsCid, uint256 anchorIndex, uint256 timestamp) external',
    'function getRemoteRouter(uint32 domain) external view returns (bytes32)',
    'function enrollRemoteRouter(uint32 domain, bytes32 router) external',
    'event AnchorSent(bytes32 indexed messageId, uint32 indexed destination, bytes32 dataHash, string ipfsCid)',
    'event AnchorReceived(uint32 indexed origin, bytes32 dataHash, string ipfsCid, uint256 anchorIndex)',
];
/**
 * Default chain configurations
 */
exports.DEFAULT_CHAINS = {
    baseSepolia: {
        chainId: ChainId.BaseSepolia,
        name: 'Base Sepolia',
        rpcUrl: 'https://sepolia.base.org',
        mailboxAddress: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D',
        igpAddress: '0x8f9C3888bFC8a5B25AED115A82eCBB788DCaFa04',
        explorerUrl: 'https://sepolia.basescan.org',
    },
    optimismSepolia: {
        chainId: ChainId.OptimismSepolia,
        name: 'Optimism Sepolia',
        rpcUrl: 'https://sepolia.optimism.io',
        mailboxAddress: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D',
        igpAddress: '0x8f9C3888bFC8a5B25AED115A82eCBB788DCaFa04',
        explorerUrl: 'https://sepolia-optimism.etherscan.io',
    },
    arbitrumSepolia: {
        chainId: ChainId.ArbitrumSepolia,
        name: 'Arbitrum Sepolia',
        rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
        mailboxAddress: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D',
        igpAddress: '0x8f9C3888bFC8a5B25AED115A82eCBB788DCaFa04',
        explorerUrl: 'https://sepolia.arbiscan.io',
    },
    sepolia: {
        chainId: ChainId.Sepolia,
        name: 'Sepolia',
        rpcUrl: 'https://rpc.sepolia.org',
        mailboxAddress: '0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766',
        igpAddress: '0x8f9C3888bFC8a5B25AED115A82eCBB788DCaFa04',
        explorerUrl: 'https://sepolia.etherscan.io',
    },
};
const DEFAULT_GAS_AMOUNT = 300000n;
const MESSAGE_DELIVERY_ESTIMATE = 300; // seconds
// ============================================================================
// Bridge Service
// ============================================================================
/**
 * Cross-chain bridge service using Hyperlane
 *
 * @example
 * ```typescript
 * const bridge = new BridgeService({
 *   privateKey: process.env.PRIVATE_KEY!,
 *   sourceChain: DEFAULT_CHAINS.baseSepolia,
 *   destinationChains: [DEFAULT_CHAINS.optimismSepolia],
 * });
 *
 * // Send anchor to another chain
 * const result = await bridge.sendAnchor(
 *   ChainId.OptimismSepolia,
 *   { dataHash: '0x...', ipfsCid: 'bafy...', anchorIndex: 1, timestamp: Date.now() }
 * );
 * ```
 */
class BridgeService {
    constructor(config) {
        this.config = {
            ...config,
            defaultGasPayment: config.defaultGasPayment || ethers_1.ethers.parseEther('0.01'),
        };
        // Initialize source chain
        this.sourceProvider = new ethers_1.JsonRpcProvider(config.sourceChain.rpcUrl);
        this.sourceWallet = new ethers_1.Wallet(config.privateKey, this.sourceProvider);
        // Initialize Hyperlane contracts
        this.mailbox = new ethers_1.Contract(config.sourceChain.mailboxAddress, MAILBOX_ABI, this.sourceWallet);
        this.igp = new ethers_1.Contract(config.sourceChain.igpAddress, IGP_ABI, this.sourceWallet);
        // Initialize destination providers
        this.destinationProviders = new Map();
        for (const chain of config.destinationChains) {
            this.destinationProviders.set(chain.chainId, new ethers_1.JsonRpcProvider(chain.rpcUrl));
        }
        // Message tracking
        this.messageTracking = new Map();
    }
    // ==========================================================================
    // Core Messaging
    // ==========================================================================
    /**
     * Send a cross-chain message
     */
    async dispatch(destinationChain, recipient, messageBody) {
        const destConfig = this.getDestinationConfig(destinationChain);
        // Convert message body to bytes
        const body = typeof messageBody === 'string'
            ? ethers_1.ethers.toUtf8Bytes(messageBody)
            : messageBody;
        // Quote gas payment
        const gasPayment = await this.quoteGasPayment(destinationChain);
        // Format recipient as bytes32
        const recipientBytes32 = ethers_1.ethers.zeroPadValue(recipient, 32);
        // Dispatch message
        const tx = await this.mailbox.dispatch(destinationChain, recipientBytes32, body, { value: gasPayment });
        const receipt = await tx.wait();
        // Extract message ID from event
        const dispatchEvent = receipt.logs.find((log) => log.topics[0] === ethers_1.ethers.id('Dispatch(address,uint32,bytes32,bytes)'));
        const messageId = dispatchEvent?.topics[3] || ethers_1.ethers.keccak256(body);
        // Track message
        this.messageTracking.set(messageId, {
            messageId,
            status: MessageStatus.Dispatched,
            sourceChain: this.config.sourceChain.chainId,
            destinationChain,
            dispatchTx: receipt.hash,
            dispatchedAt: Date.now(),
        });
        return {
            messageId,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            estimatedDelivery: MESSAGE_DELIVERY_ESTIMATE,
        };
    }
    /**
     * Send an anchor cross-chain
     */
    async sendAnchor(destinationChain, payload) {
        // Encode anchor payload
        const abiCoder = ethers_1.ethers.AbiCoder.defaultAbiCoder();
        const encodedPayload = abiCoder.encode(['bytes32', 'string', 'uint256', 'uint256'], [payload.dataHash, payload.ipfsCid, payload.anchorIndex, payload.timestamp]);
        // Get destination router address (assuming same address on all chains for simplicity)
        const destConfig = this.getDestinationConfig(destinationChain);
        const recipient = destConfig.mailboxAddress; // In production, this would be the SentinelRouter
        return this.dispatch(destinationChain, recipient, encodedPayload);
    }
    /**
     * Send anchor to multiple chains
     */
    async broadcastAnchor(payload, chains) {
        const targetChains = chains ||
            this.config.destinationChains.map(c => c.chainId);
        const results = new Map();
        for (const chainId of targetChains) {
            try {
                const result = await this.sendAnchor(chainId, payload);
                results.set(chainId, result);
            }
            catch (error) {
                results.set(chainId, error);
            }
        }
        return results;
    }
    // ==========================================================================
    // Gas Estimation
    // ==========================================================================
    /**
     * Quote gas payment for cross-chain message
     */
    async quoteGasPayment(destinationChain, gasAmount = DEFAULT_GAS_AMOUNT) {
        try {
            return await this.igp.quoteGasPayment(destinationChain, gasAmount);
        }
        catch {
            // Return default if quote fails
            return this.config.defaultGasPayment;
        }
    }
    /**
     * Get exchange rate and gas price for destination
     */
    async getGasInfo(destinationChain) {
        const [exchangeRate, gasPrice] = await this.igp.getExchangeRateAndGasPrice(destinationChain);
        return { exchangeRate, gasPrice };
    }
    // ==========================================================================
    // Message Tracking
    // ==========================================================================
    /**
     * Check if message has been delivered
     */
    async isDelivered(messageId) {
        try {
            return await this.mailbox.delivered(messageId);
        }
        catch {
            return false;
        }
    }
    /**
     * Get message tracking info
     */
    async getMessageStatus(messageId) {
        const tracking = this.messageTracking.get(messageId);
        if (!tracking) {
            return null;
        }
        // Check if delivered
        if (tracking.status === MessageStatus.Dispatched) {
            const delivered = await this.isDelivered(messageId);
            if (delivered) {
                tracking.status = MessageStatus.Delivered;
                tracking.deliveredAt = Date.now();
            }
        }
        return tracking;
    }
    /**
     * Wait for message delivery
     */
    async waitForDelivery(messageId, timeout = 600000 // 10 minutes
    ) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const status = await this.getMessageStatus(messageId);
            if (status?.status === MessageStatus.Delivered) {
                return status;
            }
            if (status?.status === MessageStatus.Failed) {
                throw new Error(`Message delivery failed: ${status.error}`);
            }
            // Poll every 10 seconds
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        throw new Error(`Message delivery timed out after ${timeout}ms`);
    }
    // ==========================================================================
    // Chain Management
    // ==========================================================================
    /**
     * Get source chain config
     */
    getSourceChain() {
        return this.config.sourceChain;
    }
    /**
     * Get destination chain configs
     */
    getDestinationChains() {
        return this.config.destinationChains;
    }
    /**
     * Get destination config by chain ID
     */
    getDestinationConfig(chainId) {
        const config = this.config.destinationChains.find(c => c.chainId === chainId);
        if (!config) {
            throw new Error(`Destination chain ${chainId} not configured`);
        }
        return config;
    }
    /**
     * Add destination chain
     */
    addDestinationChain(config) {
        if (!this.config.destinationChains.find(c => c.chainId === config.chainId)) {
            this.config.destinationChains.push(config);
            this.destinationProviders.set(config.chainId, new ethers_1.JsonRpcProvider(config.rpcUrl));
        }
    }
    /**
     * Get wallet address
     */
    getAddress() {
        return this.sourceWallet.address;
    }
    /**
     * Get wallet balance
     */
    async getBalance() {
        return this.sourceProvider.getBalance(this.sourceWallet.address);
    }
    // ==========================================================================
    // Utilities
    // ==========================================================================
    /**
     * Encode address as bytes32
     */
    static addressToBytes32(address) {
        return ethers_1.ethers.zeroPadValue(address, 32);
    }
    /**
     * Decode bytes32 to address
     */
    static bytes32ToAddress(bytes32) {
        return ethers_1.ethers.getAddress('0x' + bytes32.slice(26));
    }
    /**
     * Compute domain identifier from chain ID
     * (Hyperlane uses domain IDs which often match chain IDs)
     */
    static chainIdToDomain(chainId) {
        return chainId;
    }
    /**
     * Get Hyperlane explorer URL for message
     */
    static getExplorerUrl(messageId) {
        return `https://explorer.hyperlane.xyz/message/${messageId}`;
    }
}
exports.BridgeService = BridgeService;
// ============================================================================
// Mock Bridge Service (for testing)
// ============================================================================
/**
 * Mock bridge service for testing without real blockchain
 */
class MockBridgeService {
    constructor() {
        this.messages = new Map();
        this.delivered = new Set();
        this.messageCounter = 0;
    }
    /**
     * Simulate dispatch
     */
    async dispatch(destinationChain, recipient, messageBody) {
        const messageId = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`message-${++this.messageCounter}`));
        const body = typeof messageBody === 'string'
            ? ethers_1.ethers.hexlify(ethers_1.ethers.toUtf8Bytes(messageBody))
            : ethers_1.ethers.hexlify(messageBody);
        const message = {
            messageId,
            sourceChain: ChainId.BaseSepolia,
            destinationChain,
            sender: '0x' + '1'.repeat(40),
            recipient,
            body,
            timestamp: Date.now(),
            txHash: ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`tx-${this.messageCounter}`)),
        };
        this.messages.set(messageId, message);
        // Simulate delivery after delay
        setTimeout(() => {
            this.delivered.add(messageId);
        }, 5000);
        return {
            messageId,
            txHash: message.txHash,
            blockNumber: 1000000 + this.messageCounter,
            gasUsed: 150000n,
            estimatedDelivery: 5,
        };
    }
    /**
     * Simulate anchor send
     */
    async sendAnchor(destinationChain, payload) {
        const abiCoder = ethers_1.ethers.AbiCoder.defaultAbiCoder();
        const encodedPayload = abiCoder.encode(['bytes32', 'string', 'uint256', 'uint256'], [payload.dataHash, payload.ipfsCid, payload.anchorIndex, payload.timestamp]);
        return this.dispatch(destinationChain, '0x' + '0'.repeat(40), encodedPayload);
    }
    /**
     * Check delivery
     */
    async isDelivered(messageId) {
        return this.delivered.has(messageId);
    }
    /**
     * Get message
     */
    getMessage(messageId) {
        return this.messages.get(messageId);
    }
    /**
     * Quote gas (mock)
     */
    async quoteGasPayment() {
        return ethers_1.ethers.parseEther('0.001');
    }
}
exports.MockBridgeService = MockBridgeService;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create bridge service with default testnet configuration
 */
function createTestnetBridge(privateKey) {
    return new BridgeService({
        privateKey,
        sourceChain: exports.DEFAULT_CHAINS.baseSepolia,
        destinationChains: [
            exports.DEFAULT_CHAINS.optimismSepolia,
            exports.DEFAULT_CHAINS.arbitrumSepolia,
        ],
    });
}
/**
 * Create mock bridge for testing
 */
function createMockBridge() {
    return new MockBridgeService();
}
// ============================================================================
// Exports - All types and classes are already exported inline above
// ============================================================================
//# sourceMappingURL=index.js.map