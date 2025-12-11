/**
 * Sentinel Grid Storage Service
 *
 * Complete IPFS/Web3.Storage integration for decentralized data pinning.
 * Supports multiple storage backends with automatic fallback.
 *
 * @packageDocumentation
 */
/**
 * Storage provider configuration
 */
export interface StorageConfig {
    /** Web3.Storage API token (from w3up) */
    web3StorageToken?: string;
    /** Local IPFS node API URL */
    localIpfsUrl?: string;
    /** Pinata API key */
    pinataApiKey?: string;
    /** Pinata secret */
    pinataSecret?: string;
    /** HMAC key for signing */
    hmacKey: string;
    /** Preferred provider order */
    providerOrder?: StorageProvider[];
    /** Gateway URLs for retrieval */
    gateways?: string[];
    /** Enable encryption by default */
    encryptByDefault?: boolean;
    /** Request timeout in ms */
    timeout?: number;
}
/**
 * Supported storage providers
 */
export type StorageProvider = 'web3storage' | 'pinata' | 'local' | 'mock';
/**
 * Result from pinning operation
 */
export interface PinResult {
    /** IPFS Content Identifier */
    cid: string;
    /** SHA-256 hash of original payload */
    sha256: string;
    /** HMAC signature of the hash */
    signature: string;
    /** Size in bytes */
    size: number;
    /** ISO timestamp */
    timestamp: string;
    /** Provider used */
    provider: StorageProvider;
    /** Whether data was encrypted */
    encrypted: boolean;
}
/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
    /** Initialization vector (base64) */
    iv: string;
    /** Encrypted data (base64) */
    data: string;
    /** GCM authentication tag (base64) */
    authTag: string;
    /** Encryption version for future compatibility */
    version: number;
}
/**
 * Verification result
 */
export interface VerifyResult {
    /** Whether verification passed */
    valid: boolean;
    /** Computed hash */
    computedHash: string;
    /** Expected hash (if provided) */
    expectedHash?: string;
    /** Signature valid */
    signatureValid: boolean;
}
/**
 * Retrieval result
 */
export interface RetrieveResult {
    /** Retrieved data */
    data: unknown;
    /** CID that was retrieved */
    cid: string;
    /** Gateway used */
    gateway: string;
    /** Whether data was encrypted */
    wasEncrypted: boolean;
}
/**
 * Batch pin result
 */
export interface BatchPinResult {
    /** Successfully pinned items */
    success: PinResult[];
    /** Failed items with errors */
    failed: Array<{
        index: number;
        error: string;
    }>;
    /** Total count */
    total: number;
}
/**
 * Main storage service for IPFS operations
 *
 * @example
 * ```typescript
 * const storage = new StorageService({
 *   web3StorageToken: process.env.WEB3_STORAGE_TOKEN,
 *   hmacKey: process.env.HMAC_KEY,
 * });
 *
 * // Pin data
 * const result = await storage.pin({ nodeId: 'N001', status: 'active' });
 * console.log('CID:', result.cid);
 *
 * // Retrieve data
 * const data = await storage.retrieve(result.cid);
 * ```
 */
export declare class StorageService {
    private config;
    private w3Client;
    constructor(config: StorageConfig);
    /**
     * Pin data to IPFS with automatic provider fallback
     *
     * @param payload - Data to pin
     * @param options - Pin options
     * @returns Pin result with CID and metadata
     */
    pin(payload: Record<string, unknown>, options?: {
        encrypt?: boolean;
        provider?: StorageProvider;
        metadata?: Record<string, string>;
    }): Promise<PinResult>;
    /**
     * Pin multiple items in batch
     */
    pinBatch(payloads: Record<string, unknown>[], options?: {
        encrypt?: boolean;
    }): Promise<BatchPinResult>;
    /**
     * Retrieve data from IPFS by CID
     */
    retrieve(cid: string, options?: {
        decrypt?: boolean;
        timeout?: number;
    }): Promise<RetrieveResult>;
    /**
     * Verify data integrity and signature
     */
    verify(data: unknown, expectedHash?: string, expectedSignature?: string): VerifyResult;
    private pinToProvider;
    /**
     * Pin to Web3.Storage using w3up-client
     */
    private pinToWeb3Storage;
    /**
     * Pin to Pinata
     */
    private pinToPinata;
    /**
     * Pin to local IPFS node
     */
    private pinToLocalIPFS;
    /**
     * Compute deterministic SHA-256 hash
     */
    computeHash(data: unknown): string;
    /**
     * Sign data with HMAC-SHA256
     */
    sign(data: string): string;
    /**
     * Verify HMAC signature
     */
    verifySignature(data: string, signature: string): boolean;
    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data: unknown): EncryptedPayload;
    /**
     * Decrypt data
     */
    decrypt(encrypted: EncryptedPayload): unknown;
    /**
     * Sanitize payload by removing sensitive fields
     */
    sanitize(payload: Record<string, unknown>): Record<string, unknown>;
    /**
     * Generate mock CID for testing/demo
     */
    private generateMockCID;
    /**
     * Check if payload is encrypted
     */
    private isEncryptedPayload;
    /**
     * Validate CID format
     */
    isValidCID(cid: string): boolean;
    /**
     * Get configured providers
     */
    getAvailableProviders(): StorageProvider[];
}
/**
 * Create a new storage service instance
 */
export declare function createStorageService(config: StorageConfig): StorageService;
/**
 * Get or create the default storage service instance
 */
export declare function getStorageService(config?: StorageConfig): StorageService;
/**
 * Reset the default instance (for testing)
 */
export declare function resetStorageService(): void;
//# sourceMappingURL=index.d.ts.map