/**
 * Sentinel Grid Backend - Contract Service
 * Ethers.js integration for on-chain anchoring
 */
import { ethers } from 'ethers';
export interface AnchorResult {
    txHash: string;
    blockNumber: number;
    payloadHash: string;
    ipfsCid: string;
    timestamp: Date;
    gasUsed: string;
}
export interface VerifyResult {
    exists: boolean;
    timestamp: Date | null;
    submitter: string | null;
}
export interface MintResult {
    txHash: string;
    tokenId: string;
    owner: string;
    tokenURI: string;
}
export interface ChainConfig {
    name: string;
    rpcUrl: string;
    chainId: number;
    dataAnchorAddress?: string;
    sensorAssetAddress?: string;
}
export declare class ContractService {
    private provider;
    private signer;
    private currentChain;
    /**
     * Connect to a chain
     */
    connect(chainName?: string): Promise<void>;
    /**
     * Get connection status
     */
    isConnected(): boolean;
    /**
     * Get signer address
     */
    getAddress(): string | null;
    /**
     * Get current chain info
     */
    getChain(): ChainConfig | null;
    /**
     * Get ETH balance
     */
    getBalance(): Promise<string>;
    /**
     * Submit anchor to blockchain
     */
    anchor(payloadHash: string, ipfsCid: string): Promise<AnchorResult>;
    /**
     * Verify anchor exists on-chain
     */
    verify(payloadHash: string): Promise<VerifyResult>;
    /**
     * Get anchor details
     */
    getAnchor(payloadHash: string): Promise<{
        payloadHash: string;
        ipfsCid: string;
        timestamp: Date;
        submitter: string;
    } | null>;
    /**
     * Mint a sensor asset NFT
     */
    mintSensorAsset(to: string, tokenURI: string): Promise<MintResult>;
    /**
     * Get NFT token URI
     */
    getTokenURI(tokenId: string): Promise<string>;
    /**
     * Wait for transaction confirmation
     */
    waitForTx(txHash: string, confirmations?: number): Promise<ethers.TransactionReceipt | null>;
    /**
     * Estimate gas for anchor transaction
     */
    estimateAnchorGas(payloadHash: string, ipfsCid: string): Promise<string>;
    /**
     * Get current gas price
     */
    getGasPrice(): Promise<string>;
    /**
     * Disconnect from chain
     */
    disconnect(): void;
}
export declare function getContract(): ContractService;
/**
 * Initialize contract service (call on startup)
 */
export declare function initializeContract(chain?: string): Promise<ContractService>;
