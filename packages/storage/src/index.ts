/**
 * Sentinel Grid Storage Service
 * 
 * Complete IPFS/Web3.Storage integration for decentralized data pinning.
 * Supports multiple storage backends with automatic fallback.
 * 
 * @packageDocumentation
 */

import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

// ============================================================================
// Types
// ============================================================================

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
  failed: Array<{ index: number; error: string }>;
  /** Total count */
  total: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_GATEWAYS = [
  'https://w3s.link/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

const SENSITIVE_FIELDS = [
  'privatekey',
  'apikey',
  'password',
  'secret',
  'ssn',
  'socialsecurity',
  'creditcard',
  'token',
  'auth',
  'credential',
];

const ENCRYPTION_VERSION = 1;
const DEFAULT_TIMEOUT = 30000;

// ============================================================================
// Storage Service Class
// ============================================================================

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
export class StorageService {
  private config: Required<StorageConfig>;
  private w3Client: any = null;

  constructor(config: StorageConfig) {
    this.config = {
      web3StorageToken: config.web3StorageToken || '',
      localIpfsUrl: config.localIpfsUrl || 'http://127.0.0.1:5001',
      pinataApiKey: config.pinataApiKey || '',
      pinataSecret: config.pinataSecret || '',
      hmacKey: config.hmacKey,
      providerOrder: config.providerOrder || ['web3storage', 'pinata', 'local', 'mock'],
      gateways: config.gateways || DEFAULT_GATEWAYS,
      encryptByDefault: config.encryptByDefault || false,
      timeout: config.timeout || DEFAULT_TIMEOUT,
    };
  }

  // ==========================================================================
  // Core Pin/Retrieve Operations
  // ==========================================================================

  /**
   * Pin data to IPFS with automatic provider fallback
   * 
   * @param payload - Data to pin
   * @param options - Pin options
   * @returns Pin result with CID and metadata
   */
  async pin(
    payload: Record<string, unknown>,
    options: {
      encrypt?: boolean;
      provider?: StorageProvider;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<PinResult> {
    const shouldEncrypt = options.encrypt ?? this.config.encryptByDefault;
    
    // Sanitize payload
    const sanitized = this.sanitize(payload);
    
    // Optionally encrypt
    let dataToPin: Record<string, unknown> = sanitized;
    if (shouldEncrypt) {
      dataToPin = this.encrypt(sanitized) as unknown as Record<string, unknown>;
    }
    
    // Serialize
    const json = JSON.stringify(dataToPin);
    const size = Buffer.byteLength(json, 'utf8');
    
    // Compute hash and signature
    const sha256Hash = this.computeHash(sanitized);
    const signature = this.sign(sha256Hash);
    
    // Try providers in order
    const providers = options.provider 
      ? [options.provider] 
      : this.config.providerOrder;
    
    let cid: string | null = null;
    let usedProvider: StorageProvider = 'mock';
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        cid = await this.pinToProvider(provider, json, options.metadata);
        usedProvider = provider;
        break;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider} failed:`, (error as Error).message);
      }
    }
    
    if (!cid) {
      // Fallback to mock CID
      cid = this.generateMockCID(sha256Hash);
      usedProvider = 'mock';
    }
    
    return {
      cid,
      sha256: sha256Hash,
      signature,
      size,
      timestamp: new Date().toISOString(),
      provider: usedProvider,
      encrypted: shouldEncrypt,
    };
  }

  /**
   * Pin multiple items in batch
   */
  async pinBatch(
    payloads: Record<string, unknown>[],
    options: { encrypt?: boolean } = {}
  ): Promise<BatchPinResult> {
    const results: PinResult[] = [];
    const failed: Array<{ index: number; error: string }> = [];
    
    for (let i = 0; i < payloads.length; i++) {
      try {
        const result = await this.pin(payloads[i], options);
        results.push(result);
      } catch (error) {
        failed.push({ index: i, error: (error as Error).message });
      }
    }
    
    return {
      success: results,
      failed,
      total: payloads.length,
    };
  }

  /**
   * Retrieve data from IPFS by CID
   */
  async retrieve(
    cid: string,
    options: { decrypt?: boolean; timeout?: number } = {}
  ): Promise<RetrieveResult> {
    const timeout = options.timeout || this.config.timeout;
    
    for (const gateway of this.config.gateways) {
      try {
        const url = gateway.endsWith('/') ? `${gateway}${cid}` : `${gateway}/${cid}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          continue;
        }
        
        let data = await response.json();
        let wasEncrypted = false;
        
        // Check if data is encrypted
        if (this.isEncryptedPayload(data) && options.decrypt !== false) {
          data = this.decrypt(data as EncryptedPayload);
          wasEncrypted = true;
        }
        
        return {
          data,
          cid,
          gateway,
          wasEncrypted,
        };
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`Failed to retrieve CID ${cid} from any gateway`);
  }

  /**
   * Verify data integrity and signature
   */
  verify(
    data: unknown,
    expectedHash?: string,
    expectedSignature?: string
  ): VerifyResult {
    const computedHash = this.computeHash(data);
    const computedSignature = this.sign(computedHash);
    
    const hashValid = expectedHash ? computedHash === expectedHash : true;
    const signatureValid = expectedSignature 
      ? computedSignature === expectedSignature 
      : true;
    
    return {
      valid: hashValid && signatureValid,
      computedHash,
      expectedHash,
      signatureValid,
    };
  }

  // ==========================================================================
  // Provider-Specific Methods
  // ==========================================================================

  private async pinToProvider(
    provider: StorageProvider,
    data: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    switch (provider) {
      case 'web3storage':
        return this.pinToWeb3Storage(data, metadata);
      case 'pinata':
        return this.pinToPinata(data, metadata);
      case 'local':
        return this.pinToLocalIPFS(data);
      case 'mock':
        return this.generateMockCID(this.computeHash(JSON.parse(data)));
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Pin to Web3.Storage using w3up-client
   */
  private async pinToWeb3Storage(
    data: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    if (!this.config.web3StorageToken) {
      throw new Error('Web3.Storage token not configured');
    }
    
    // Use the HTTP API for simplicity (w3up-client requires more setup)
    const blob = new Blob([data], { type: 'application/json' });
    
    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.web3StorageToken}`,
        'X-Name': metadata?.name || 'sentinel-grid-data',
      },
      body: blob,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Web3.Storage upload failed: ${error}`);
    }
    
    const result = await response.json() as { cid: string };
    return result.cid;
  }

  /**
   * Pin to Pinata
   */
  private async pinToPinata(
    data: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    if (!this.config.pinataApiKey || !this.config.pinataSecret) {
      throw new Error('Pinata credentials not configured');
    }
    
    const body = {
      pinataContent: JSON.parse(data),
      pinataMetadata: {
        name: metadata?.name || 'sentinel-grid-data',
        keyvalues: metadata,
      },
    };
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': this.config.pinataApiKey,
        'pinata_secret_api_key': this.config.pinataSecret,
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }
    
    const result = await response.json() as { IpfsHash: string };
    return result.IpfsHash;
  }

  /**
   * Pin to local IPFS node
   */
  private async pinToLocalIPFS(data: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([data], { type: 'application/json' }));
    
    const response = await fetch(`${this.config.localIpfsUrl}/api/v0/add`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Local IPFS add failed: ${response.statusText}`);
    }
    
    const result = await response.json() as { Hash: string };
    return result.Hash;
  }

  // ==========================================================================
  // Cryptographic Operations
  // ==========================================================================

  /**
   * Compute deterministic SHA-256 hash
   */
  computeHash(data: unknown): string {
    const json = typeof data === 'string' 
      ? data 
      : JSON.stringify(data, Object.keys(data as object).sort());
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Sign data with HMAC-SHA256
   */
  sign(data: string): string {
    return createHmac('sha256', this.config.hmacKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(data: string, signature: string): boolean {
    const expected = this.sign(data);
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: unknown): EncryptedPayload {
    const iv = randomBytes(12);
    const key = createHash('sha256').update(this.config.hmacKey).digest();
    
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const json = JSON.stringify(data);
    
    let encrypted = cipher.update(json, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('base64'),
      data: encrypted,
      authTag: authTag.toString('base64'),
      version: ENCRYPTION_VERSION,
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted: EncryptedPayload): unknown {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const key = createHash('sha256').update(this.config.hmacKey).digest();
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Sanitize payload by removing sensitive fields
   */
  sanitize(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(payload)) {
      const keyLower = key.toLowerCase();
      
      // Skip sensitive fields
      if (SENSITIVE_FIELDS.some(field => keyLower.includes(field))) {
        continue;
      }
      
      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Generate mock CID for testing/demo
   */
  private generateMockCID(hash: string): string {
    // Generate CIDv1 format
    return `bafybeig${hash.slice(0, 52)}`;
  }

  /**
   * Check if payload is encrypted
   */
  private isEncryptedPayload(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.iv === 'string' &&
      typeof obj.data === 'string' &&
      typeof obj.authTag === 'string' &&
      typeof obj.version === 'number'
    );
  }

  /**
   * Validate CID format
   */
  isValidCID(cid: string): boolean {
    try {
      CID.parse(cid);
      return true;
    } catch {
      // Also accept mock CIDs starting with bafybeig
      return cid.startsWith('bafybeig') && cid.length >= 59;
    }
  }

  /**
   * Get configured providers
   */
  getAvailableProviders(): StorageProvider[] {
    const available: StorageProvider[] = [];
    
    if (this.config.web3StorageToken) available.push('web3storage');
    if (this.config.pinataApiKey && this.config.pinataSecret) available.push('pinata');
    if (this.config.localIpfsUrl) available.push('local');
    available.push('mock');
    
    return available;
  }
}

// ============================================================================
// Factory and Singleton
// ============================================================================

let defaultInstance: StorageService | null = null;

/**
 * Create a new storage service instance
 */
export function createStorageService(config: StorageConfig): StorageService {
  return new StorageService(config);
}

/**
 * Get or create the default storage service instance
 */
export function getStorageService(config?: StorageConfig): StorageService {
  if (!defaultInstance) {
    if (!config) {
      throw new Error('Storage service not initialized. Provide config on first call.');
    }
    defaultInstance = new StorageService(config);
  }
  return defaultInstance;
}

/**
 * Reset the default instance (for testing)
 */
export function resetStorageService(): void {
  defaultInstance = null;
}
