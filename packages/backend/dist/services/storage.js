"use strict";
/**
 * Sentinel Grid Backend - Storage Service
 * IPFS / Web3.Storage integration for data pinning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
exports.getStorage = getStorage;
const crypto_1 = require("crypto");
const config_js_1 = require("../config.js");
// ============================================================================
// Storage Service
// ============================================================================
class StorageService {
    constructor() {
        this.fieldsBlacklist = [
            'privateKey',
            'apiKey',
            'password',
            'secret',
            'ssn',
            'socialSecurity',
            'creditCard',
        ];
    }
    /**
     * Sanitize payload by removing blacklisted fields
     */
    sanitize(payload) {
        const sanitized = {};
        for (const [key, value] of Object.entries(payload)) {
            // Skip blacklisted fields
            if (this.fieldsBlacklist.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
                continue;
            }
            // Recursively sanitize nested objects
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                sanitized[key] = this.sanitize(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Compute SHA-256 hash of data
     */
    computeHash(data) {
        const json = JSON.stringify(data, Object.keys(data).sort());
        return (0, crypto_1.createHash)('sha256').update(json).digest('hex');
    }
    /**
     * Sign hash with HMAC
     */
    sign(hash) {
        return (0, crypto_1.createHmac)('sha256', config_js_1.config.hmacKey)
            .update(hash)
            .digest('hex');
    }
    /**
     * Verify signature
     */
    verify(hash, signature) {
        const expected = this.sign(hash);
        return expected === signature;
    }
    /**
     * Encrypt payload using AES-256-GCM
     */
    encrypt(data) {
        const iv = (0, crypto_1.randomBytes)(12);
        const key = (0, crypto_1.createHash)('sha256').update(config_js_1.config.hmacKey).digest();
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
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
    decrypt(encrypted) {
        const iv = Buffer.from(encrypted.iv, 'base64');
        const key = (0, crypto_1.createHash)('sha256').update(config_js_1.config.hmacKey).digest();
        const authTag = Buffer.from(encrypted.authTag, 'base64');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }
    /**
     * Pin data to IPFS (Web3.Storage or local)
     */
    async pin(payload) {
        // Sanitize payload
        const sanitized = this.sanitize(payload);
        const json = JSON.stringify(sanitized);
        const size = Buffer.byteLength(json, 'utf8');
        // Compute hash and signature
        const sha256 = this.computeHash(sanitized);
        const signature = this.sign(sha256);
        let cid;
        if (config_js_1.config.ipfs.useLocal) {
            cid = await this.pinToLocalIPFS(json);
        }
        else if (config_js_1.config.ipfs.web3StorageToken) {
            cid = await this.pinToWeb3Storage(json);
        }
        else {
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
    async pinToLocalIPFS(data) {
        try {
            const response = await fetch(`${config_js_1.config.ipfs.localApiUrl}/api/v0/add`, {
                method: 'POST',
                body: new URLSearchParams({ 'wrap-with-directory': 'false' }),
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (!response.ok) {
                throw new Error(`IPFS add failed: ${response.statusText}`);
            }
            const result = await response.json();
            return result.Hash;
        }
        catch (error) {
            console.warn('Local IPFS unavailable, using mock CID');
            return this.generateMockCID(this.computeHash(data));
        }
    }
    /**
     * Pin to Web3.Storage
     */
    async pinToWeb3Storage(data) {
        // Note: This is a simplified implementation
        // In production, use the official @web3-storage/w3up-client SDK
        try {
            const response = await fetch('https://api.web3.storage/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config_js_1.config.ipfs.web3StorageToken}`,
                    'Content-Type': 'application/json',
                },
                body: data,
            });
            if (!response.ok) {
                throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
            }
            const result = await response.json();
            return result.cid;
        }
        catch (error) {
            console.warn('Web3.Storage unavailable, using mock CID');
            return this.generateMockCID(this.computeHash(data));
        }
    }
    /**
     * Generate mock CID for demo
     */
    generateMockCID(hash) {
        // Simulate CIDv1 format (baf... prefix)
        return `bafybeig${hash.slice(0, 52)}`;
    }
    /**
     * Retrieve data from IPFS
     */
    async retrieve(cid) {
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
            }
            catch {
                continue;
            }
        }
        throw new Error(`Failed to retrieve CID: ${cid}`);
    }
}
exports.StorageService = StorageService;
// Singleton
let storageInstance = null;
function getStorage() {
    if (!storageInstance) {
        storageInstance = new StorageService();
    }
    return storageInstance;
}
//# sourceMappingURL=storage.js.map