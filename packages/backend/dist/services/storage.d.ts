/**
 * Sentinel Grid Backend - Storage Service
 * IPFS / Web3.Storage integration for data pinning
 */
export interface PinResult {
    cid: string;
    sha256: string;
    signature: string;
    size: number;
    timestamp: string;
}
export interface EncryptedPayload {
    iv: string;
    data: string;
    authTag: string;
}
export declare class StorageService {
    private fieldsBlacklist;
    /**
     * Sanitize payload by removing blacklisted fields
     */
    sanitize(payload: Record<string, unknown>): Record<string, unknown>;
    /**
     * Compute SHA-256 hash of data
     */
    computeHash(data: unknown): string;
    /**
     * Sign hash with HMAC
     */
    sign(hash: string): string;
    /**
     * Verify signature
     */
    verify(hash: string, signature: string): boolean;
    /**
     * Encrypt payload using AES-256-GCM
     */
    encrypt(data: unknown): EncryptedPayload;
    /**
     * Decrypt payload
     */
    decrypt(encrypted: EncryptedPayload): unknown;
    /**
     * Pin data to IPFS (Web3.Storage or local)
     */
    pin(payload: Record<string, unknown>): Promise<PinResult>;
    /**
     * Pin to local IPFS node
     */
    private pinToLocalIPFS;
    /**
     * Pin to Web3.Storage
     */
    private pinToWeb3Storage;
    /**
     * Generate mock CID for demo
     */
    private generateMockCID;
    /**
     * Retrieve data from IPFS
     */
    retrieve(cid: string): Promise<unknown>;
}
export declare function getStorage(): StorageService;
