/**
 * Bridge Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import {
  BridgeService,
  MockBridgeService,
  ChainId,
  DEFAULT_CHAINS,
  createMockBridge,
  createTestnetBridge,
  type AnchorPayload,
  type ChainConfig,
} from './index';

describe('MockBridgeService', () => {
  let bridge: MockBridgeService;

  beforeEach(() => {
    bridge = createMockBridge();
  });

  describe('dispatch', () => {
    it('should dispatch a message', async () => {
      const result = await bridge.dispatch(
        ChainId.OptimismSepolia,
        '0x' + '1'.repeat(40),
        'Hello, cross-chain!'
      );

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('blockNumber');
      expect(result).toHaveProperty('gasUsed');
      expect(result).toHaveProperty('estimatedDelivery');
    });

    it('should generate unique message IDs', async () => {
      const result1 = await bridge.dispatch(
        ChainId.OptimismSepolia,
        '0x' + '1'.repeat(40),
        'Message 1'
      );

      const result2 = await bridge.dispatch(
        ChainId.OptimismSepolia,
        '0x' + '1'.repeat(40),
        'Message 2'
      );

      expect(result1.messageId).not.toBe(result2.messageId);
    });

    it('should handle Uint8Array message body', async () => {
      const body = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await bridge.dispatch(
        ChainId.BaseSepolia,
        '0x' + '2'.repeat(40),
        body
      );

      expect(result.messageId).toBeDefined();
    });
  });

  describe('sendAnchor', () => {
    it('should send an anchor cross-chain', async () => {
      const payload: AnchorPayload = {
        dataHash: '0x' + 'a'.repeat(64),
        ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        anchorIndex: 1,
        timestamp: Date.now(),
      };

      const result = await bridge.sendAnchor(ChainId.OptimismSepolia, payload);

      expect(result.messageId).toBeDefined();
      expect(result.txHash).toBeDefined();
    });

    it('should encode payload correctly', async () => {
      const payload: AnchorPayload = {
        dataHash: ethers.keccak256(ethers.toUtf8Bytes('test-data')),
        ipfsCid: 'QmTest123',
        anchorIndex: 42,
        timestamp: 1700000000000,
      };

      const result = await bridge.sendAnchor(ChainId.ArbitrumSepolia, payload);
      const message = bridge.getMessage(result.messageId);

      expect(message).toBeDefined();
      expect(message?.destinationChain).toBe(ChainId.ArbitrumSepolia);
    });
  });

  describe('isDelivered', () => {
    it('should return false initially', async () => {
      const result = await bridge.dispatch(
        ChainId.OptimismSepolia,
        '0x' + '1'.repeat(40),
        'Test'
      );

      const delivered = await bridge.isDelivered(result.messageId);
      expect(delivered).toBe(false);
    });

    it('should return true after simulated delivery', async () => {
      const result = await bridge.dispatch(
        ChainId.OptimismSepolia,
        '0x' + '1'.repeat(40),
        'Test'
      );

      // Wait for simulated delivery (5 seconds in mock)
      await new Promise(resolve => setTimeout(resolve, 6000));

      const delivered = await bridge.isDelivered(result.messageId);
      expect(delivered).toBe(true);
    }, 10000);
  });

  describe('quoteGasPayment', () => {
    it('should return mock gas quote', async () => {
      const quote = await bridge.quoteGasPayment();
      expect(quote).toBe(ethers.parseEther('0.001'));
    });
  });

  describe('getMessage', () => {
    it('should return stored message', async () => {
      const result = await bridge.dispatch(
        ChainId.BaseSepolia,
        '0x' + '3'.repeat(40),
        'Stored message'
      );

      const message = bridge.getMessage(result.messageId);

      expect(message).toBeDefined();
      expect(message?.messageId).toBe(result.messageId);
      expect(message?.destinationChain).toBe(ChainId.BaseSepolia);
    });

    it('should return undefined for unknown message', () => {
      const message = bridge.getMessage('0x' + '0'.repeat(64));
      expect(message).toBeUndefined();
    });
  });
});

describe('ChainId', () => {
  it('should have correct mainnet chain IDs', () => {
    expect(ChainId.Ethereum).toBe(1);
    expect(ChainId.Optimism).toBe(10);
    expect(ChainId.Base).toBe(8453);
    expect(ChainId.Arbitrum).toBe(42161);
    expect(ChainId.Polygon).toBe(137);
  });

  it('should have correct testnet chain IDs', () => {
    expect(ChainId.Sepolia).toBe(11155111);
    expect(ChainId.OptimismSepolia).toBe(11155420);
    expect(ChainId.BaseSepolia).toBe(84532);
    expect(ChainId.ArbitrumSepolia).toBe(421614);
  });
});

describe('DEFAULT_CHAINS', () => {
  it('should have Base Sepolia config', () => {
    const config = DEFAULT_CHAINS.baseSepolia;

    expect(config.chainId).toBe(ChainId.BaseSepolia);
    expect(config.name).toBe('Base Sepolia');
    expect(config.rpcUrl).toContain('base.org');
    expect(config.mailboxAddress).toBeDefined();
    expect(config.igpAddress).toBeDefined();
  });

  it('should have Optimism Sepolia config', () => {
    const config = DEFAULT_CHAINS.optimismSepolia;

    expect(config.chainId).toBe(ChainId.OptimismSepolia);
    expect(config.name).toBe('Optimism Sepolia');
    expect(config.rpcUrl).toContain('optimism.io');
  });

  it('should have Arbitrum Sepolia config', () => {
    const config = DEFAULT_CHAINS.arbitrumSepolia;

    expect(config.chainId).toBe(ChainId.ArbitrumSepolia);
    expect(config.name).toBe('Arbitrum Sepolia');
  });

  it('should have Sepolia config', () => {
    const config = DEFAULT_CHAINS.sepolia;

    expect(config.chainId).toBe(ChainId.Sepolia);
    expect(config.name).toBe('Sepolia');
  });
});

describe('BridgeService static methods', () => {
  describe('addressToBytes32', () => {
    it('should pad address to 32 bytes', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const bytes32 = BridgeService.addressToBytes32(address);

      expect(bytes32).toHaveLength(66); // 0x + 64 hex chars
      expect(bytes32.endsWith('1234567890123456789012345678901234567890')).toBe(true);
    });
  });

  describe('bytes32ToAddress', () => {
    it('should extract address from bytes32', () => {
      const bytes32 = '0x0000000000000000000000001234567890123456789012345678901234567890';
      const address = BridgeService.bytes32ToAddress(bytes32);

      expect(address.toLowerCase()).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('chainIdToDomain', () => {
    it('should return chain ID as domain', () => {
      expect(BridgeService.chainIdToDomain(ChainId.BaseSepolia)).toBe(84532);
      expect(BridgeService.chainIdToDomain(ChainId.OptimismSepolia)).toBe(11155420);
    });
  });

  describe('getExplorerUrl', () => {
    it('should return Hyperlane explorer URL', () => {
      const messageId = '0x' + 'a'.repeat(64);
      const url = BridgeService.getExplorerUrl(messageId);

      expect(url).toBe(`https://explorer.hyperlane.xyz/message/${messageId}`);
    });
  });
});

describe('Integration scenarios', () => {
  let bridge: MockBridgeService;

  beforeEach(() => {
    bridge = createMockBridge();
  });

  it('should handle multi-chain anchor broadcast simulation', async () => {
    const payload: AnchorPayload = {
      dataHash: ethers.keccak256(ethers.toUtf8Bytes('infrastructure-snapshot')),
      ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      anchorIndex: 100,
      timestamp: Date.now(),
    };

    const destinations = [
      ChainId.OptimismSepolia,
      ChainId.ArbitrumSepolia,
      ChainId.Sepolia,
    ];

    const results = await Promise.all(
      destinations.map(chain => bridge.sendAnchor(chain, payload))
    );

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.messageId).toBeDefined();
      expect(result.txHash).toBeDefined();
    });

    // All message IDs should be unique
    const messageIds = results.map(r => r.messageId);
    const uniqueIds = new Set(messageIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('should track message status through delivery', async () => {
    const result = await bridge.dispatch(
      ChainId.BaseSepolia,
      '0x' + '1'.repeat(40),
      'Track me'
    );

    // Initially not delivered
    expect(await bridge.isDelivered(result.messageId)).toBe(false);

    // Message should be stored
    const message = bridge.getMessage(result.messageId);
    expect(message).toBeDefined();
    expect(message?.txHash).toBe(result.txHash);
  });
});

describe('AnchorPayload encoding', () => {
  it('should encode standard payload', () => {
    const payload: AnchorPayload = {
      dataHash: '0x' + 'f'.repeat(64),
      ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      anchorIndex: 12345,
      timestamp: 1700000000000,
    };

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ['bytes32', 'string', 'uint256', 'uint256'],
      [payload.dataHash, payload.ipfsCid, payload.anchorIndex, payload.timestamp]
    );

    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe('string');

    // Decode and verify
    const decoded = abiCoder.decode(
      ['bytes32', 'string', 'uint256', 'uint256'],
      encoded
    );

    expect(decoded[0]).toBe(payload.dataHash);
    expect(decoded[1]).toBe(payload.ipfsCid);
    expect(decoded[2]).toBe(BigInt(payload.anchorIndex));
    expect(decoded[3]).toBe(BigInt(payload.timestamp));
  });
});

describe('Error handling', () => {
  it('should handle invalid chain gracefully in mock', async () => {
    const bridge = createMockBridge();
    
    // Mock bridge accepts any chain ID
    const result = await bridge.dispatch(
      999999 as ChainId,
      '0x' + '1'.repeat(40),
      'Test'
    );

    expect(result.messageId).toBeDefined();
  });
});
