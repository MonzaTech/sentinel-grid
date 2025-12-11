/**
 * Sentinel Grid Backend - Storage Service
 * IPFS / Web3.Storage integration for data pinning
 */

import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from '../config.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Storage Service
// ============================================================================

export class StorageService {
  private fieldsBlacklist: string[] = [
    'privateKey',
    'apiKey',
    'password',
    'secret',
    'ssn',
    'socialSecurity',
    'creditCard',
  ];

  /**
   * Sanitize payload by removing blacklisted fields
   */
  sanitize(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(payload)) {
      // Skip blacklisted fields
      if (this.fieldsBlacklist.some((field) => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
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
   * Compute SHA-256 hash of data
   */
  computeHash(data: unknown): string {
    const json = JSON.stringify(data, Object.keys(data as object).sort());
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Sign hash with HMAC
   */
  sign(hash: string): string {
    return createHmac('sha256', config.hmacKey)
      .update(hash)
      .digest('hex');
  }

  /**
   * Verify signature
   */
  verify(hash: string, signature: string): boolean {
    const expected = this.sign(hash);
    return expected === signature;
  }

  /**
   * Encrypt payload using AES-256-GCM
   */
  encrypt(data: unknown): EncryptedPayload {
    const iv = randomBytes(12);
    const key = createHash('sha256').update(config.hmacKey).digest();
    
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const json = JSON.stringify(data);
    
    let encrypted = cipher.update(json, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('base64'),
      data: encrypted,
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt payload
   */
  decrypt(encrypted: EncryptedPayload): unknown {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const key = createHash('sha256').update(config.hmacKey).digest();
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Pin data to IPFS (Web3.Storage or local)
   */
  async pin(payload: Record<string, unknown>): Promise<PinResult> {
    // Sanitize payload
    const sanitized = this.sanitize(payload);
    const json = JSON.stringify(sanitized);
    const size = Buffer.byteLength(json, 'utf8');
    
    // Compute hash and signature
    const sha256 = this.computeHash(sanitized);
    const signature = this.sign(sha256);
    
    let cid: string;
    
    if (config.ipfs.useLocal) {
      cid = await this.pinToLocalIPFS(json);
    } else if (config.ipfs.web3StorageToken) {
      cid = await this.pinToWeb3Storage(json);
    } else {
      // Mock CID for demo without IPFS
      cid = this.generateMockCID(sha256);
    }
    
    return {
      cid,
      sha256,
      signature,
      size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pin to local IPFS node
   */
  private async pinToLocalIPFS(data: string): Promise<string> {
    try {
      const response = await fetch(`${config.ipfs.localApiUrl}/api/v0/add`, {
        method: 'POST',
        body: new URLSearchParams({ 'wrap-with-directory': 'false' }),
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`IPFS add failed: ${response.statusText}`);
      }
      
      const result = await response.json() as { Hash: string };
      return result.Hash;
    } catch (error) {
      console.warn('Local IPFS unavailable, using mock CID');
      return this.generateMockCID(this.computeHash(data));
    }
  }

  /**
   * Pin to Web3.Storage
   */
  private async pinToWeb3Storage(data: string): Promise<string> {
    // Note: This is a simplified implementation
    // In production, use the official @web3-storage/w3up-client SDK
    try {
      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.ipfs.web3StorageToken}`,
          'Content-Type': 'application/json',
        },
        body: data,
      });
      
      if (!response.ok) {
        throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
      }
      
      const result = await response.json() as { cid: string };
      return result.cid;
    } catch (error) {
      console.warn('Web3.Storage unavailable, using mock CID');
      return this.generateMockCID(this.computeHash(data));
    }
  }

  /**
   * Generate mock CID for demo
   */
  private generateMockCID(hash: string): string {
    // Simulate CIDv1 format (baf... prefix)
    return `bafybeig${hash.slice(0, 52)}`;
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieve(cid: string): Promise<unknown> {
    // Try IPFS gateway
    const gateways = [
      `https://w3s.link/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];
    
    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, {
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch {
        continue;
      }
    }
    
    throw new Error(`Failed to retrieve CID: ${cid}`);
  }
}

// Singleton
let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = new StorageService();
  }
  return storageInstance;
}
