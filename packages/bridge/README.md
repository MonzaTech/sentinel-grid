# @sentinel-grid/bridge

Cross-chain bridging service for Sentinel Grid using [Hyperlane](https://hyperlane.xyz/).

## Features

- **Multi-Chain Messaging**: Send messages across supported chains
- **Anchor Synchronization**: Sync data anchors to multiple chains
- **Gas Estimation**: Quote cross-chain gas payments
- **Message Tracking**: Track message delivery status
- **Mock Service**: Full mock implementation for testing

## Supported Chains

### Testnets
| Chain | Domain ID | Status |
|-------|-----------|--------|
| Base Sepolia | 84532 | ✅ Supported |
| Optimism Sepolia | 11155420 | ✅ Supported |
| Arbitrum Sepolia | 421614 | ✅ Supported |
| Sepolia | 11155111 | ✅ Supported |

### Mainnets
| Chain | Domain ID | Status |
|-------|-----------|--------|
| Base | 8453 | 🔜 Coming |
| Optimism | 10 | 🔜 Coming |
| Arbitrum | 42161 | 🔜 Coming |
| Ethereum | 1 | 🔜 Coming |

## Installation

```bash
npm install @sentinel-grid/bridge
```

## Quick Start

### Using Mock Bridge (Testing)

```typescript
import { createMockBridge, ChainId } from '@sentinel-grid/bridge';

const bridge = createMockBridge();

// Send a message
const result = await bridge.dispatch(
  ChainId.OptimismSepolia,
  '0x1234...', // recipient
  'Hello, cross-chain!'
);

console.log('Message ID:', result.messageId);
console.log('TX Hash:', result.txHash);

// Check delivery
const delivered = await bridge.isDelivered(result.messageId);
```

### Using Real Bridge (Testnet)

```typescript
import { createTestnetBridge, ChainId } from '@sentinel-grid/bridge';

const bridge = createTestnetBridge(process.env.PRIVATE_KEY!);

// Send anchor cross-chain
const result = await bridge.sendAnchor(ChainId.OptimismSepolia, {
  dataHash: '0x...',
  ipfsCid: 'bafy...',
  anchorIndex: 1,
  timestamp: Date.now(),
});

// Wait for delivery
await bridge.waitForDelivery(result.messageId);
```

## API Reference

### BridgeService

```typescript
const bridge = new BridgeService({
  privateKey: '0x...',
  sourceChain: DEFAULT_CHAINS.baseSepolia,
  destinationChains: [
    DEFAULT_CHAINS.optimismSepolia,
    DEFAULT_CHAINS.arbitrumSepolia,
  ],
});
```

#### dispatch(destinationChain, recipient, messageBody)

Send a raw cross-chain message.

```typescript
const result = await bridge.dispatch(
  ChainId.OptimismSepolia,
  '0x1234567890123456789012345678901234567890',
  'Hello!'
);
```

#### sendAnchor(destinationChain, payload)

Send an anchor to another chain.

```typescript
const result = await bridge.sendAnchor(ChainId.OptimismSepolia, {
  dataHash: '0x...',       // SHA-256 hash
  ipfsCid: 'bafy...',      // IPFS CID
  anchorIndex: 1,          // Source chain index
  timestamp: Date.now(),   // Original timestamp
});
```

#### broadcastAnchor(payload, chains?)

Send anchor to multiple chains.

```typescript
const results = await bridge.broadcastAnchor(payload, [
  ChainId.OptimismSepolia,
  ChainId.ArbitrumSepolia,
]);
```

#### quoteGasPayment(destinationChain, gasAmount?)

Quote gas payment for cross-chain message.

```typescript
const quote = await bridge.quoteGasPayment(ChainId.OptimismSepolia);
console.log('Gas payment:', ethers.formatEther(quote), 'ETH');
```

#### isDelivered(messageId)

Check if message has been delivered.

```typescript
const delivered = await bridge.isDelivered(messageId);
```

#### waitForDelivery(messageId, timeout?)

Wait for message delivery.

```typescript
const tracking = await bridge.waitForDelivery(messageId, 300000);
```

### MockBridgeService

Full mock implementation for testing without real blockchain.

```typescript
const mock = createMockBridge();

// Same API as BridgeService
const result = await mock.sendAnchor(ChainId.OptimismSepolia, payload);

// Simulates delivery after 5 seconds
await new Promise(resolve => setTimeout(resolve, 6000));
const delivered = await mock.isDelivered(result.messageId);
```

## Smart Contracts

### SentinelRouter.sol

Cross-chain router contract for Hyperlane integration.

```solidity
// Send anchor to remote chain
function sendAnchor(
    uint32 destinationDomain,
    bytes32 dataHash,
    string calldata ipfsCid,
    uint256 anchorIndex
) external payable returns (bytes32 messageId);

// Broadcast to multiple chains
function broadcastAnchor(
    uint32[] calldata destinations,
    bytes32 dataHash,
    string calldata ipfsCid,
    uint256 anchorIndex
) external payable returns (bytes32[] memory messageIds);

// Handle incoming message (called by Hyperlane)
function handle(
    uint32 _origin,
    bytes32 _sender,
    bytes calldata _body
) external payable;
```

### Deployment

```bash
# Deploy router
npx hardhat run scripts/deploy-router.ts --network baseSepolia

# Enroll remote routers
npx hardhat run scripts/enroll-routers.ts --network baseSepolia
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Base Sepolia                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ DataAnchor  │───▶│SentinelRouter│───▶│Hyperlane Mailbox│    │
│  └─────────────┘    └──────────────┘    └────────┬────────┘    │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │
                     Hyperlane Validators          │
                     & Relayers                    │
                                                   │
┌──────────────────────────────────────────────────┼──────────────┐
│                    Optimism Sepolia              │              │
│  ┌─────────────────┐    ┌──────────────┐    ┌───▼────────────┐ │
│  │Hyperlane Mailbox│───▶│SentinelRouter│───▶│ RemoteAnchors  │ │
│  └─────────────────┘    └──────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Message Flow

1. **Anchor Creation**: Data anchored on source chain (DataAnchor)
2. **Dispatch**: SentinelRouter dispatches message via Hyperlane Mailbox
3. **Validation**: Hyperlane validators verify the message
4. **Relay**: Relayers deliver message to destination chain
5. **Receipt**: Destination SentinelRouter receives and stores anchor

## Gas Costs (Estimated)

| Operation | Source Gas | Cross-Chain Payment |
|-----------|------------|---------------------|
| sendAnchor | ~80,000 | ~0.01 ETH |
| broadcastAnchor (3 chains) | ~200,000 | ~0.03 ETH |
| handle (receive) | ~100,000 | — |

## Configuration

### Chain Config

```typescript
interface ChainConfig {
  chainId: ChainId;
  name: string;
  rpcUrl: string;
  mailboxAddress: string;
  igpAddress: string;
  explorerUrl?: string;
}
```

### Bridge Config

```typescript
interface BridgeConfig {
  privateKey: string;
  sourceChain: ChainConfig;
  destinationChains: ChainConfig[];
  defaultGasPayment?: bigint;
  ismAddress?: string;
}
```

## Hyperlane Explorer

Track messages: https://explorer.hyperlane.xyz

```typescript
const url = BridgeService.getExplorerUrl(messageId);
// https://explorer.hyperlane.xyz/message/0x...
```

## Error Handling

```typescript
try {
  const result = await bridge.sendAnchor(chainId, payload);
} catch (error) {
  if (error.message.includes('not configured')) {
    // Destination chain not configured
  }
  if (error.message.includes('insufficient')) {
    // Insufficient gas payment
  }
}
```

## Testing

```bash
npm test
npm run test:coverage
```

## Resources

- [Hyperlane Docs](https://docs.hyperlane.xyz/)
- [Hyperlane Explorer](https://explorer.hyperlane.xyz/)
- [Supported Chains](https://docs.hyperlane.xyz/docs/resources/domains)

## License

MIT © 2024 Monza Tech LLC
