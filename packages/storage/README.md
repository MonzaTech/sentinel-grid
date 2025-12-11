# @sentinel-grid/storage

IPFS/Web3.Storage integration for Sentinel Grid decentralized data pinning.

## Features

- **Multi-provider support**: Web3.Storage, Pinata, local IPFS, mock
- **Automatic fallback**: Tries providers in order until one succeeds
- **Encryption**: AES-256-GCM encryption for sensitive data
- **Sanitization**: Automatic removal of sensitive fields
- **Verification**: SHA-256 hashing + HMAC signing

## Installation

```bash
npm install @sentinel-grid/storage
```

## Quick Start

```typescript
import { createStorageService } from '@sentinel-grid/storage';

const storage = createStorageService({
  web3StorageToken: process.env.WEB3_STORAGE_TOKEN,
  hmacKey: process.env.HMAC_KEY,
});

// Pin data
const result = await storage.pin({
  nodeId: 'NODE-001',
  status: 'active',
  metrics: { voltage: 240, current: 15 },
});

console.log('CID:', result.cid);
console.log('SHA-256:', result.sha256);
console.log('Signature:', result.signature);

// Retrieve data
const data = await storage.retrieve(result.cid);
console.log('Retrieved:', data);

// Verify integrity
const verification = storage.verify(data, result.sha256, result.signature);
console.log('Valid:', verification.valid);
```

## Configuration

```typescript
interface StorageConfig {
  // REQUIRED
  hmacKey: string;              // Key for HMAC signing

  // OPTIONAL - Providers
  web3StorageToken?: string;    // Web3.Storage API token
  pinataApiKey?: string;        // Pinata API key
  pinataSecret?: string;        // Pinata secret
  localIpfsUrl?: string;        // Local IPFS node URL

  // OPTIONAL - Behavior
  providerOrder?: string[];     // Provider fallback order
  gateways?: string[];          // IPFS gateway URLs
  encryptByDefault?: boolean;   // Encrypt all data by default
  timeout?: number;             // Request timeout (ms)
}
```

## API Reference

### `pin(payload, options?)`

Pin data to IPFS.

```typescript
const result = await storage.pin(
  { data: 'value' },
  { 
    encrypt: true,              // Encrypt before pinning
    provider: 'web3storage',    // Force specific provider
  }
);

// Result:
{
  cid: string;        // IPFS Content Identifier
  sha256: string;     // Hash of original data
  signature: string;  // HMAC signature
  size: number;       // Size in bytes
  timestamp: string;  // ISO timestamp
  provider: string;   // Provider used
  encrypted: boolean; // Whether encrypted
}
```

### `pinBatch(payloads, options?)`

Pin multiple items.

```typescript
const result = await storage.pinBatch([
  { id: 1, data: 'a' },
  { id: 2, data: 'b' },
]);

// Result:
{
  success: PinResult[];
  failed: Array<{ index: number; error: string }>;
  total: number;
}
```

### `retrieve(cid, options?)`

Retrieve data from IPFS.

```typescript
const result = await storage.retrieve('bafybeig...', {
  decrypt: true,    // Auto-decrypt if encrypted
  timeout: 10000,   // Custom timeout
});

// Result:
{
  data: unknown;       // Retrieved data
  cid: string;         // CID that was retrieved
  gateway: string;     // Gateway used
  wasEncrypted: boolean;
}
```

### `verify(data, hash?, signature?)`

Verify data integrity.

```typescript
const result = storage.verify(data, expectedHash, expectedSignature);

// Result:
{
  valid: boolean;
  computedHash: string;
  expectedHash?: string;
  signatureValid: boolean;
}
```

### `encrypt(data)` / `decrypt(encrypted)`

Encrypt and decrypt data.

```typescript
const encrypted = storage.encrypt({ secret: 'data' });
// { iv: '...', data: '...', authTag: '...', version: 1 }

const decrypted = storage.decrypt(encrypted);
// { secret: 'data' }
```

### `sanitize(payload)`

Remove sensitive fields.

```typescript
const clean = storage.sanitize({
  nodeId: 'N001',
  apiKey: 'secret',    // Removed
  password: 'secret',  // Removed
});
// { nodeId: 'N001' }
```

## Providers

### Web3.Storage

Primary cloud IPFS provider.

```typescript
const storage = createStorageService({
  web3StorageToken: 'eyJ...',
  hmacKey: 'your-key',
});
```

### Pinata

Alternative cloud provider.

```typescript
const storage = createStorageService({
  pinataApiKey: 'your-key',
  pinataSecret: 'your-secret',
  hmacKey: 'your-key',
});
```

### Local IPFS

Use local Kubo node.

```typescript
const storage = createStorageService({
  localIpfsUrl: 'http://127.0.0.1:5001',
  hmacKey: 'your-key',
  providerOrder: ['local'],
});
```

### Mock (Demo)

For testing without real IPFS.

```typescript
const storage = createStorageService({
  hmacKey: 'test-key',
  providerOrder: ['mock'],
});
```

## Security

### Encryption

- Algorithm: AES-256-GCM
- Key derivation: SHA-256 of HMAC key
- Random IV per encryption
- Authenticated encryption with auth tag

### Sensitive Fields

Automatically removed:
- `privateKey`, `apiKey`, `password`
- `secret`, `ssn`, `socialSecurity`
- `creditCard`, `token`, `auth`, `credential`

## Gateway Configuration

```typescript
const storage = createStorageService({
  hmacKey: 'key',
  gateways: [
    'https://w3s.link/ipfs/',
    'https://dweb.link/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ],
});
```

## Error Handling

```typescript
try {
  const result = await storage.pin(data);
} catch (error) {
  if (error.message.includes('Web3.Storage')) {
    // Handle Web3.Storage specific error
  }
  // Fallback to mock will happen automatically
}
```

## Testing

```bash
npm test
npm run test:coverage
```

## License

MIT © Monza Tech LLC
