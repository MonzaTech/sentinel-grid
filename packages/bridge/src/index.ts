/**
 * Sentinel Grid Cross-Chain Bridge Service
 * 
 * Hyperlane integration for multi-chain data anchoring and messaging.
 * Enables cross-chain verification and synchronization of infrastructure data.
 * 
 * @packageDocumentation
 */

import { ethers, Contract, Wallet, JsonRpcProvider, Interface } from 'ethers';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported chains for cross-chain messaging
 */
export enum ChainId {
  // Mainnets
  Ethereum = 1,
  Optimism = 10,
  Base = 8453,
  Arbitrum = 42161,
  Polygon = 137,
  
  // Testnets
  Sepolia = 11155111,
  OptimismSepolia = 11155420,
  BaseSepolia = 84532,
  ArbitrumSepolia = 421614,
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
export enum MessageStatus {
  Pending = 'pending',
  Dispatched = 'dispatched',
  Delivered = 'delivered',
  Failed = 'failed',
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
export const DEFAULT_CHAINS: Record<string, ChainConfig> = {
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
export class BridgeService {
  private config: BridgeConfig;
  private sourceProvider: JsonRpcProvider;
  private sourceWallet: Wallet;
  private mailbox: Contract;
  private igp: Contract;
  private destinationProviders: Map<ChainId, JsonRpcProvider>;
  private messageTracking: Map<string, MessageTracking>;

  constructor(config: BridgeConfig) {
    this.config = {
      ...config,
      defaultGasPayment: config.defaultGasPayment || ethers.parseEther('0.01'),
    };

    // Initialize source chain
    this.sourceProvider = new JsonRpcProvider(config.sourceChain.rpcUrl);
    this.sourceWallet = new Wallet(config.privateKey, this.sourceProvider);

    // Initialize Hyperlane contracts
    this.mailbox = new Contract(
      config.sourceChain.mailboxAddress,
      MAILBOX_ABI,
      this.sourceWallet
    );

    this.igp = new Contract(
      config.sourceChain.igpAddress,
      IGP_ABI,
      this.sourceWallet
    );

    // Initialize destination providers
    this.destinationProviders = new Map();
    for (const chain of config.destinationChains) {
      this.destinationProviders.set(
        chain.chainId,
        new JsonRpcProvider(chain.rpcUrl)
      );
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
  async dispatch(
    destinationChain: ChainId,
    recipient: string,
    messageBody: string | Uint8Array
  ): Promise<DispatchResult> {
    const destConfig = this.getDestinationConfig(destinationChain);
    
    // Convert message body to bytes
    const body = typeof messageBody === 'string'
      ? ethers.toUtf8Bytes(messageBody)
      : messageBody;

    // Quote gas payment
    const gasPayment = await this.quoteGasPayment(destinationChain);

    // Format recipient as bytes32
    const recipientBytes32 = ethers.zeroPadValue(recipient, 32);

    // Dispatch message
    const tx = await this.mailbox.dispatch(
      destinationChain,
      recipientBytes32,
      body,
      { value: gasPayment }
    );

    const receipt = await tx.wait();

    // Extract message ID from event
    const dispatchEvent = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id('Dispatch(address,uint32,bytes32,bytes)')
    );

    const messageId = dispatchEvent?.topics[3] || ethers.keccak256(body);

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
  async sendAnchor(
    destinationChain: ChainId,
    payload: AnchorPayload
  ): Promise<DispatchResult> {
    // Encode anchor payload
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedPayload = abiCoder.encode(
      ['bytes32', 'string', 'uint256', 'uint256'],
      [payload.dataHash, payload.ipfsCid, payload.anchorIndex, payload.timestamp]
    );

    // Get destination router address (assuming same address on all chains for simplicity)
    const destConfig = this.getDestinationConfig(destinationChain);
    const recipient = destConfig.mailboxAddress; // In production, this would be the SentinelRouter

    return this.dispatch(destinationChain, recipient, encodedPayload);
  }

  /**
   * Send anchor to multiple chains
   */
  async broadcastAnchor(
    payload: AnchorPayload,
    chains?: ChainId[]
  ): Promise<Map<ChainId, DispatchResult | Error>> {
    const targetChains = chains || 
      this.config.destinationChains.map(c => c.chainId);

    const results = new Map<ChainId, DispatchResult | Error>();

    for (const chainId of targetChains) {
      try {
        const result = await this.sendAnchor(chainId, payload);
        results.set(chainId, result);
      } catch (error) {
        results.set(chainId, error as Error);
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
  async quoteGasPayment(
    destinationChain: ChainId,
    gasAmount: bigint = DEFAULT_GAS_AMOUNT
  ): Promise<bigint> {
    try {
      return await this.igp.quoteGasPayment(destinationChain, gasAmount);
    } catch {
      // Return default if quote fails
      return this.config.defaultGasPayment!;
    }
  }

  /**
   * Get exchange rate and gas price for destination
   */
  async getGasInfo(destinationChain: ChainId): Promise<{
    exchangeRate: bigint;
    gasPrice: bigint;
  }> {
    const [exchangeRate, gasPrice] = await this.igp.getExchangeRateAndGasPrice(
      destinationChain
    );
    return { exchangeRate, gasPrice };
  }

  // ==========================================================================
  // Message Tracking
  // ==========================================================================

  /**
   * Check if message has been delivered
   */
  async isDelivered(messageId: string): Promise<boolean> {
    try {
      return await this.mailbox.delivered(messageId);
    } catch {
      return false;
    }
  }

  /**
   * Get message tracking info
   */
  async getMessageStatus(messageId: string): Promise<MessageTracking | null> {
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
  async waitForDelivery(
    messageId: string,
    timeout: number = 600000 // 10 minutes
  ): Promise<MessageTracking> {
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
  getSourceChain(): ChainConfig {
    return this.config.sourceChain;
  }

  /**
   * Get destination chain configs
   */
  getDestinationChains(): ChainConfig[] {
    return this.config.destinationChains;
  }

  /**
   * Get destination config by chain ID
   */
  getDestinationConfig(chainId: ChainId): ChainConfig {
    const config = this.config.destinationChains.find(c => c.chainId === chainId);
    if (!config) {
      throw new Error(`Destination chain ${chainId} not configured`);
    }
    return config;
  }

  /**
   * Add destination chain
   */
  addDestinationChain(config: ChainConfig): void {
    if (!this.config.destinationChains.find(c => c.chainId === config.chainId)) {
      this.config.destinationChains.push(config);
      this.destinationProviders.set(
        config.chainId,
        new JsonRpcProvider(config.rpcUrl)
      );
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.sourceWallet.address;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<bigint> {
    return this.sourceProvider.getBalance(this.sourceWallet.address);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Encode address as bytes32
   */
  static addressToBytes32(address: string): string {
    return ethers.zeroPadValue(address, 32);
  }

  /**
   * Decode bytes32 to address
   */
  static bytes32ToAddress(bytes32: string): string {
    return ethers.getAddress('0x' + bytes32.slice(26));
  }

  /**
   * Compute domain identifier from chain ID
   * (Hyperlane uses domain IDs which often match chain IDs)
   */
  static chainIdToDomain(chainId: ChainId): number {
    return chainId;
  }

  /**
   * Get Hyperlane explorer URL for message
   */
  static getExplorerUrl(messageId: string): string {
    return `https://explorer.hyperlane.xyz/message/${messageId}`;
  }
}

// ============================================================================
// Mock Bridge Service (for testing)
// ============================================================================

/**
 * Mock bridge service for testing without real blockchain
 */
export class MockBridgeService {
  private messages: Map<string, CrossChainMessage>;
  private delivered: Set<string>;
  private messageCounter: number;

  constructor() {
    this.messages = new Map();
    this.delivered = new Set();
    this.messageCounter = 0;
  }

  /**
   * Simulate dispatch
   */
  async dispatch(
    destinationChain: ChainId,
    recipient: string,
    messageBody: string | Uint8Array
  ): Promise<DispatchResult> {
    const messageId = ethers.keccak256(
      ethers.toUtf8Bytes(`message-${++this.messageCounter}`)
    );

    const body = typeof messageBody === 'string'
      ? ethers.hexlify(ethers.toUtf8Bytes(messageBody))
      : ethers.hexlify(messageBody);

    const message: CrossChainMessage = {
      messageId,
      sourceChain: ChainId.BaseSepolia,
      destinationChain,
      sender: '0x' + '1'.repeat(40),
      recipient,
      body,
      timestamp: Date.now(),
      txHash: ethers.keccak256(ethers.toUtf8Bytes(`tx-${this.messageCounter}`)),
    };

    this.messages.set(messageId, message);

    // Simulate delivery after delay
    setTimeout(() => {
      this.delivered.add(messageId);
    }, 5000);

    return {
      messageId,
      txHash: message.txHash!,
      blockNumber: 1000000 + this.messageCounter,
      gasUsed: 150000n,
      estimatedDelivery: 5,
    };
  }

  /**
   * Simulate anchor send
   */
  async sendAnchor(
    destinationChain: ChainId,
    payload: AnchorPayload
  ): Promise<DispatchResult> {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedPayload = abiCoder.encode(
      ['bytes32', 'string', 'uint256', 'uint256'],
      [payload.dataHash, payload.ipfsCid, payload.anchorIndex, payload.timestamp]
    );

    return this.dispatch(
      destinationChain,
      '0x' + '0'.repeat(40),
      encodedPayload
    );
  }

  /**
   * Check delivery
   */
  async isDelivered(messageId: string): Promise<boolean> {
    return this.delivered.has(messageId);
  }

  /**
   * Get message
   */
  getMessage(messageId: string): CrossChainMessage | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Quote gas (mock)
   */
  async quoteGasPayment(): Promise<bigint> {
    return ethers.parseEther('0.001');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create bridge service with default testnet configuration
 */
export function createTestnetBridge(privateKey: string): BridgeService {
  return new BridgeService({
    privateKey,
    sourceChain: DEFAULT_CHAINS.baseSepolia,
    destinationChains: [
      DEFAULT_CHAINS.optimismSepolia,
      DEFAULT_CHAINS.arbitrumSepolia,
    ],
  });
}

/**
 * Create mock bridge for testing
 */
export function createMockBridge(): MockBridgeService {
  return new MockBridgeService();
}

// ============================================================================
// Exports - All types and classes are already exported inline above
// ============================================================================
