# @sentinel-grid/contracts

Smart contracts for Sentinel Grid - Data anchoring and NFT asset management on Base/Optimism L2.

## Contracts

### DataAnchor.sol
Immutable on-chain anchoring of IPFS content hashes for audit trails and regulatory compliance.

**Features:**
- Anchor SHA-256 payload hashes with IPFS CIDs
- Verify anchor existence on-chain
- Authorization system for controlled access
- Paginated anchor enumeration

**Use Cases:**
- Infrastructure state snapshots
- Prediction audit trails
- Mitigation action logs
- Compliance evidence

### SensorAsset.sol
ERC-721 NFT representing infrastructure sensor/node assets.

**Features:**
- Mintable by authorized minters
- Asset type classification (PowerGrid, Telecom, DataCenter, etc.)
- Status tracking (Active, Warning, Critical, Offline, Maintenance)
- Node ID mapping for external system integration
- Batch minting support

**Asset Types:**
- PowerGrid (0)
- Telecom (1)
- WaterTreatment (2)
- DataCenter (3)
- Transportation (4)
- Industrial (5)
- Other (6)

### SimpleMarketplace.sol
NFT marketplace for trading SensorAsset tokens.

**Features:**
- Fixed-price listings
- Platform fee (configurable, max 10%)
- Minimum listing price enforcement
- Volume and fee tracking
- Emergency withdrawal functions

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Start local node
npm run node

# Deploy to local node
npm run deploy:local
```

## Deployment

### Local Development

```bash
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local
```

### Testnet Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your private key

# Deploy to Base Sepolia
npm run deploy:base-sepolia

# Deploy to Optimism Sepolia
npm run deploy:optimism-sepolia
```

### Verify Contracts

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx hardhat test test/DataAnchor.test.ts
```

## Contract Addresses

After deployment, addresses are saved to `deployments/<network>.json`.

### Testnets
| Contract | Base Sepolia | Optimism Sepolia |
|----------|--------------|------------------|
| DataAnchor | TBD | TBD |
| SensorAsset | TBD | TBD |
| SimpleMarketplace | TBD | TBD |

## Gas Costs

| Operation | Estimated Gas |
|-----------|---------------|
| DataAnchor.anchor() | ~65,000 |
| SensorAsset.mint() | ~150,000 |
| SensorAsset.mintWithMetadata() | ~180,000 |
| SimpleMarketplace.createListing() | ~100,000 |
| SimpleMarketplace.buy() | ~120,000 |

## Integration with Backend

The backend service at `packages/backend/src/services/contract.ts` expects these contract ABIs:

```typescript
// DataAnchor ABI
const DATA_ANCHOR_ABI = [
  'function anchor(bytes32 payloadHash, string calldata ipfsCid) external returns (uint256)',
  'function verify(bytes32 payloadHash) external view returns (bool exists, uint256 timestamp, address submitter)',
  'function getAnchor(bytes32 payloadHash) external view returns (tuple(bytes32 payloadHash, string ipfsCid, uint256 timestamp, address submitter))',
  'event Anchored(bytes32 indexed payloadHash, string ipfsCid, address indexed submitter)',
];

// SensorAsset ABI
const SENSOR_ASSET_ABI = [
  'function mint(address to, string calldata tokenURI) external returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];
```

After deployment, update the backend configuration:
```bash
# In packages/backend/.env
CONTRACT_ADDRESS=<DataAnchor address>
SENSOR_ASSET_ADDRESS=<SensorAsset address>
```

## Security Considerations

1. **Private Keys**: Never commit private keys. Use environment variables.
2. **Authorization**: Enable authorization in production (`requireAuthorization = true`).
3. **Fee Recipient**: Set a secure multisig as the marketplace fee recipient.
4. **Upgradability**: These contracts are not upgradeable. Deploy new versions for changes.

## License

MIT © Monza Tech LLC
