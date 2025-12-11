/**
 * Sentinel Grid Cross-Chain Bridge Service
 *
 * Hyperlane integration for multi-chain data anchoring and messaging.
 * Enables cross-chain verification and synchronization of infrastructure data.
 *
 * @packageDocumentation
 */
/**
 * Supported chains for cross-chain messaging
 */
export declare enum ChainId {
    Ethereum = 1,
    Optimism = 10,
    Base = 8453,
    Arbitrum = 42161,
    Polygon = 137,
    Sepolia = 11155111,
    OptimismSepolia = 11155420,
    BaseSepolia = 84532,
    ArbitrumSepolia = 421614
}
/**
 * Chain configuration
 */
export interface ChainConfig {
    chainId: ChainId;
    name: string;
    rpcUrl: string;
    mailboxAddress: string;
    igpAddress: string;
    explorerUrl?: string;
}
/**
 * Bridge configuration
 */
export interface BridgeConfig {
    /** Private key for signing transactions */
    privateKey: string;
    /** Source chain configuration */
    sourceChain: ChainConfig;
    /** Destination chain configurations */
    destinationChains: ChainConfig[];
    /** Gas payment amount (in wei) */
    defaultGasPayment?: bigint;
    /** Custom ISM address (optional) */
    ismAddress?: string;
}
/**
 * Cross-chain message
 */
export interface CrossChainMessage {
    /** Message ID (bytes32) */
    messageId: string;
    /** Source chain ID */
    sourceChain: ChainId;
    /** Destination chain ID */
    destinationChain: ChainId;
    /** Sender address */
    sender: string;
    /** Recipient address */
    recipient: string;
    /** Message body (hex encoded) */
    body: string;
    /** Timestamp */
    timestamp: number;
    /** Transaction hash */
    txHash?: string;
}
/**
 * Anchor message payload
 */
export interface AnchorPayload {
    /** SHA-256 hash of the data */
    dataHash: string;
    /** IPFS CID where data is stored */
    ipfsCid: string;
    /** Source chain anchor index */
    anchorIndex: number;
    /** Original timestamp */
    timestamp: number;
}
/**
 * Message dispatch result
 */
export interface DispatchResult {
    /** Message ID */
    messageId: string;
    /** Transaction hash */
    txHash: string;
    /** Block number */
    blockNumber: number;
    /** Gas used */
    gasUsed: bigint;
    /** Estimated delivery time (seconds) */
    estimatedDelivery: number;
}
/**
 * Message status
 */
export declare enum MessageStatus {
    Pending = "pending",
    Dispatched = "dispatched",
    Delivered = "delivered",
    Failed = "failed"
}
/**
 * Message tracking info
 */
export interface MessageTracking {
    messageId: string;
    status: MessageStatus;
    sourceChain: ChainId;
    destinationChain: ChainId;
    dispatchTx?: string;
    deliveryTx?: string;
    dispatchedAt?: number;
    deliveredAt?: number;
    error?: string;
}
/**
 * Default chain configurations
 */
export declare const DEFAULT_CHAINS: Record<string, ChainConfig>;
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
export declare class BridgeService {
    private config;
    private sourceProvider;
    private sourceWallet;
    private mailbox;
    private igp;
    private destinationProviders;
    private messageTracking;
    constructor(config: BridgeConfig);
    /**
     * Send a cross-chain message
     */
    dispatch(destinationChain: ChainId, recipient: string, messageBody: string | Uint8Array): Promise<DispatchResult>;
    /**
     * Send an anchor cross-chain
     */
    sendAnchor(destinationChain: ChainId, payload: AnchorPayload): Promise<DispatchResult>;
    /**
     * Send anchor to multiple chains
     */
    broadcastAnchor(payload: AnchorPayload, chains?: ChainId[]): Promise<Map<ChainId, DispatchResult | Error>>;
    /**
     * Quote gas payment for cross-chain message
     */
    quoteGasPayment(destinationChain: ChainId, gasAmount?: bigint): Promise<bigint>;
    /**
     * Get exchange rate and gas price for destination
     */
    getGasInfo(destinationChain: ChainId): Promise<{
        exchangeRate: bigint;
        gasPrice: bigint;
    }>;
    /**
     * Check if message has been delivered
     */
    isDelivered(messageId: string): Promise<boolean>;
    /**
     * Get message tracking info
     */
    getMessageStatus(messageId: string): Promise<MessageTracking | null>;
    /**
     * Wait for message delivery
     */
    waitForDelivery(messageId: string, timeout?: number): Promise<MessageTracking>;
    /**
     * Get source chain config
     */
    getSourceChain(): ChainConfig;
    /**
     * Get destination chain configs
     */
    getDestinationChains(): ChainConfig[];
    /**
     * Get destination config by chain ID
     */
    getDestinationConfig(chainId: ChainId): ChainConfig;
    /**
     * Add destination chain
     */
    addDestinationChain(config: ChainConfig): void;
    /**
     * Get wallet address
     */
    getAddress(): string;
    /**
     * Get wallet balance
     */
    getBalance(): Promise<bigint>;
    /**
     * Encode address as bytes32
     */
    static addressToBytes32(address: string): string;
    /**
     * Decode bytes32 to address
     */
    static bytes32ToAddress(bytes32: string): string;
    /**
     * Compute domain identifier from chain ID
     * (Hyperlane uses domain IDs which often match chain IDs)
     */
    static chainIdToDomain(chainId: ChainId): number;
    /**
     * Get Hyperlane explorer URL for message
     */
    static getExplorerUrl(messageId: string): string;
}
/**
 * Mock bridge service for testing without real blockchain
 */
export declare class MockBridgeService {
    private messages;
    private delivered;
    private messageCounter;
    constructor();
    /**
     * Simulate dispatch
     */
    dispatch(destinationChain: ChainId, recipient: string, messageBody: string | Uint8Array): Promise<DispatchResult>;
    /**
     * Simulate anchor send
     */
    sendAnchor(destinationChain: ChainId, payload: AnchorPayload): Promise<DispatchResult>;
    /**
     * Check delivery
     */
    isDelivered(messageId: string): Promise<boolean>;
    /**
     * Get message
     */
    getMessage(messageId: string): CrossChainMessage | undefined;
    /**
     * Quote gas (mock)
     */
    quoteGasPayment(): Promise<bigint>;
}
/**
 * Create bridge service with default testnet configuration
 */
export declare function createTestnetBridge(privateKey: string): BridgeService;
/**
 * Create mock bridge for testing
 */
export declare function createMockBridge(): MockBridgeService;
//# sourceMappingURL=index.d.ts.map