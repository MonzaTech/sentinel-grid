/**
 * Storage Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageService,
  createStorageService,
  getStorageService,
  resetStorageService,
  type PinResult,
  type EncryptedPayload,
} from './index';

describe('StorageService', () => {
  let storage: StorageService;
  const testHmacKey = 'test-hmac-key-for-sentinel-grid-testing';

  beforeEach(() => {
    resetStorageService();
    storage = createStorageService({
      hmacKey: testHmacKey,
      providerOrder: ['mock'],
    });
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      expect(storage).toBeInstanceOf(StorageService);
    });

    it('should work with minimal config', () => {
      const minimal = createStorageService({ hmacKey: 'test' });
      expect(minimal).toBeInstanceOf(StorageService);
    });
  });

  describe('pin', () => {
    it('should pin data and return result', async () => {
      const payload = { nodeId: 'N001', status: 'active' };
      const result = await storage.pin(payload);

      expect(result).toHaveProperty('cid');
      expect(result).toHaveProperty('sha256');
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('timestamp');
      expect(result.provider).toBe('mock');
      expect(result.encrypted).toBe(false);
    });

    it('should generate valid mock CID', async () => {
      const result = await storage.pin({ test: 'data' });
      expect(result.cid).toMatch(/^bafybeig[a-f0-9]{52}$/);
    });

    it('should compute consistent hash', async () => {
      const payload = { a: 1, b: 2 };
      const result1 = await storage.pin(payload);
      const result2 = await storage.pin(payload);
      
      expect(result1.sha256).toBe(result2.sha256);
    });

    it('should include size in result', async () => {
      const payload = { data: 'test' };
      const result = await storage.pin(payload);
      
      expect(result.size).toBeGreaterThan(0);
    });

    it('should include timestamp', async () => {
      const before = new Date().toISOString();
      const result = await storage.pin({ test: 1 });
      const after = new Date().toISOString();
      
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  describe('pin with encryption', () => {
    it('should encrypt data when requested', async () => {
      const payload = { secret: 'data' };
      const result = await storage.pin(payload, { encrypt: true });
      
      expect(result.encrypted).toBe(true);
    });

    it('should use different CID for encrypted vs unencrypted', async () => {
      const payload = { data: 'test' };
      const unencrypted = await storage.pin(payload, { encrypt: false });
      const encrypted = await storage.pin(payload, { encrypt: true });
      
      expect(encrypted.cid).not.toBe(unencrypted.cid);
    });
  });

  describe('pinBatch', () => {
    it('should pin multiple items', async () => {
      const payloads = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'c' },
      ];
      
      const result = await storage.pinBatch(payloads);
      
      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.total).toBe(3);
    });

    it('should return unique CIDs for different data', async () => {
      const payloads = [{ a: 1 }, { a: 2 }, { a: 3 }];
      const result = await storage.pinBatch(payloads);
      
      const cids = result.success.map(r => r.cid);
      const uniqueCids = new Set(cids);
      
      expect(uniqueCids.size).toBe(3);
    });
  });

  describe('sanitize', () => {
    it('should remove sensitive fields', () => {
      const payload = {
        nodeId: 'N001',
        status: 'active',
        privateKey: 'should-be-removed',
        apiKey: 'should-be-removed',
        password: 'should-be-removed',
      };
      
      const sanitized = storage.sanitize(payload);
      
      expect(sanitized.nodeId).toBe('N001');
      expect(sanitized.status).toBe('active');
      expect(sanitized).not.toHaveProperty('privateKey');
      expect(sanitized).not.toHaveProperty('apiKey');
      expect(sanitized).not.toHaveProperty('password');
    });

    it('should handle nested objects', () => {
      const payload = {
        user: {
          name: 'John',
          password: 'secret',
        },
        config: {
          apiKey: 'key',
          setting: 'value',
        },
      };
      
      const sanitized = storage.sanitize(payload);
      
      expect((sanitized.user as any).name).toBe('John');
      expect((sanitized.user as any)).not.toHaveProperty('password');
      expect((sanitized.config as any).setting).toBe('value');
      expect((sanitized.config as any)).not.toHaveProperty('apiKey');
    });

    it('should handle case-insensitive matching', () => {
      const payload = {
        PRIVATEKEY: 'secret',
        ApiKey: 'key',
        PASSWORD: 'pass',
        data: 'keep',
      };
      
      const sanitized = storage.sanitize(payload);
      
      expect(sanitized.data).toBe('keep');
      expect(Object.keys(sanitized)).toHaveLength(1);
    });
  });

  describe('computeHash', () => {
    it('should compute SHA-256 hash', () => {
      const hash = storage.computeHash({ test: 'data' });
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const hash1 = storage.computeHash({ a: 1, b: 2 });
      const hash2 = storage.computeHash({ a: 1, b: 2 });
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = storage.computeHash({ a: 1 });
      const hash2 = storage.computeHash({ a: 2 });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should sort keys for consistency', () => {
      const hash1 = storage.computeHash({ b: 2, a: 1 });
      const hash2 = storage.computeHash({ a: 1, b: 2 });
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('sign and verify', () => {
    it('should sign data', () => {
      const signature = storage.sign('test-data');
      
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent signatures', () => {
      const sig1 = storage.sign('data');
      const sig2 = storage.sign('data');
      
      expect(sig1).toBe(sig2);
    });

    it('should verify valid signature', () => {
      const data = 'test-data';
      const signature = storage.sign(data);
      
      expect(storage.verifySignature(data, signature)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const data = 'test-data';
      const signature = storage.sign(data);
      const wrongSig = signature.replace('a', 'b');
      
      expect(storage.verifySignature(data, wrongSig)).toBe(false);
    });

    it('should reject signature for different data', () => {
      const signature = storage.sign('original-data');
      
      expect(storage.verifySignature('different-data', signature)).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt data', () => {
      const data = { secret: 'message' };
      const encrypted = storage.encrypt(data);
      
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('version');
    });

    it('should decrypt data correctly', () => {
      const original = { secret: 'message', nested: { value: 123 } };
      const encrypted = storage.encrypt(original);
      const decrypted = storage.decrypt(encrypted);
      
      expect(decrypted).toEqual(original);
    });

    it('should produce different ciphertext each time', () => {
      const data = { test: 'data' };
      const enc1 = storage.encrypt(data);
      const enc2 = storage.encrypt(data);
      
      // Different IVs should produce different ciphertext
      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.data).not.toBe(enc2.data);
    });

    it('should handle various data types', () => {
      const testCases = [
        { string: 'test' },
        { number: 12345 },
        { boolean: true },
        { array: [1, 2, 3] },
        { nested: { deep: { value: 'test' } } },
        { mixed: { a: 1, b: 'two', c: [3, 4] } },
      ];
      
      for (const data of testCases) {
        const encrypted = storage.encrypt(data);
        const decrypted = storage.decrypt(encrypted);
        expect(decrypted).toEqual(data);
      }
    });
  });

  describe('verify', () => {
    it('should verify data integrity', () => {
      const data = { test: 'data' };
      const hash = storage.computeHash(data);
      const signature = storage.sign(hash);
      
      const result = storage.verify(data, hash, signature);
      
      expect(result.valid).toBe(true);
      expect(result.computedHash).toBe(hash);
      expect(result.signatureValid).toBe(true);
    });

    it('should detect hash mismatch', () => {
      const data = { test: 'data' };
      const wrongHash = 'a'.repeat(64);
      
      const result = storage.verify(data, wrongHash);
      
      expect(result.valid).toBe(false);
    });

    it('should detect signature mismatch', () => {
      const data = { test: 'data' };
      const hash = storage.computeHash(data);
      const wrongSig = 'b'.repeat(64);
      
      const result = storage.verify(data, hash, wrongSig);
      
      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });
  });

  describe('isValidCID', () => {
    it('should accept mock CIDs', () => {
      expect(storage.isValidCID('bafybeig' + 'a'.repeat(52))).toBe(true);
    });

    it('should reject invalid CIDs', () => {
      expect(storage.isValidCID('invalid')).toBe(false);
      expect(storage.isValidCID('')).toBe(false);
      expect(storage.isValidCID('bafybeig')).toBe(false); // Too short
    });
  });

  describe('getAvailableProviders', () => {
    it('should return mock provider by default', () => {
      const providers = storage.getAvailableProviders();
      
      expect(providers).toContain('mock');
    });

    it('should include web3storage when configured', () => {
      const withToken = createStorageService({
        hmacKey: testHmacKey,
        web3StorageToken: 'test-token',
      });
      
      const providers = withToken.getAvailableProviders();
      
      expect(providers).toContain('web3storage');
    });

    it('should include pinata when configured', () => {
      const withPinata = createStorageService({
        hmacKey: testHmacKey,
        pinataApiKey: 'key',
        pinataSecret: 'secret',
      });
      
      const providers = withPinata.getAvailableProviders();
      
      expect(providers).toContain('pinata');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      resetStorageService();
      
      const instance1 = getStorageService({ hmacKey: 'test' });
      const instance2 = getStorageService();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw if not initialized', () => {
      resetStorageService();
      
      expect(() => getStorageService()).toThrow();
    });
  });
});

describe('Integration scenarios', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = createStorageService({
      hmacKey: 'integration-test-key',
      providerOrder: ['mock'],
    });
  });

  it('should handle full pin -> verify workflow', async () => {
    // Pin data
    const payload = {
      nodeId: 'NODE-001',
      timestamp: Date.now(),
      readings: [1.2, 3.4, 5.6],
    };
    
    const pinResult = await storage.pin(payload);
    
    // Verify integrity
    const verifyResult = storage.verify(
      payload,
      pinResult.sha256,
      pinResult.signature
    );
    
    expect(verifyResult.valid).toBe(true);
  });

  it('should handle encrypted pin -> decrypt workflow', async () => {
    const sensitiveData = {
      nodeId: 'SECURE-001',
      metrics: { voltage: 240, current: 15 },
    };
    
    // Pin with encryption
    const pinResult = await storage.pin(sensitiveData, { encrypt: true });
    
    expect(pinResult.encrypted).toBe(true);
    
    // Manually encrypt and verify structure
    const encrypted = storage.encrypt(storage.sanitize(sensitiveData));
    const decrypted = storage.decrypt(encrypted);
    
    expect(decrypted).toEqual(sensitiveData);
  });

  it('should handle batch operations', async () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      nodeId: `NODE-${String(i).padStart(3, '0')}`,
      status: i % 2 === 0 ? 'active' : 'warning',
      timestamp: Date.now() + i,
    }));
    
    const result = await storage.pinBatch(nodes);
    
    expect(result.success).toHaveLength(10);
    expect(result.failed).toHaveLength(0);
    
    // All CIDs should be unique
    const cids = new Set(result.success.map(r => r.cid));
    expect(cids.size).toBe(10);
  });
});
