/**
 * CAR (Content Addressable aRchive) utilities
 *
 * Utilities for creating and parsing CAR files for IPFS uploads.
 * CAR files are the preferred format for Web3.Storage uploads.
 */
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import * as dagCbor from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
export interface CARBlock {
    cid: CID;
    bytes: Uint8Array;
}
export interface CARFile {
    roots: CID[];
    blocks: CARBlock[];
}
export interface FileEntry {
    name: string;
    content: Uint8Array | string;
    type?: string;
}
/**
 * Create a CID from raw bytes
 */
export declare function createCID(bytes: Uint8Array): Promise<CID>;
/**
 * Create a CID from JSON data
 */
export declare function createJSONCID(data: unknown): Promise<CID>;
/**
 * Parse a CID string
 */
export declare function parseCID(cidString: string): CID;
/**
 * Check if string is valid CID
 */
export declare function isValidCID(cidString: string): boolean;
/**
 * Encode object as CBOR-like JSON bytes
 */
export declare function encodeJSON(data: unknown): Uint8Array;
/**
 * Decode bytes as JSON
 */
export declare function decodeJSON<T = unknown>(bytes: Uint8Array): T;
/**
 * Encode string as bytes
 */
export declare function encodeString(str: string): Uint8Array;
/**
 * Decode bytes as string
 */
export declare function decodeString(bytes: Uint8Array): string;
/**
 * Create a simple single-block CAR structure
 *
 * Note: This creates a minimal CAR-like structure.
 * For full CAR support, use @ipld/car package.
 */
export declare function createSimpleCAR(data: unknown): Promise<{
    cid: CID;
    bytes: Uint8Array;
}>;
/**
 * Create multiple blocks for batch upload
 */
export declare function createBlocks(items: Array<{
    data: unknown;
    name?: string;
}>): Promise<Array<{
    cid: CID;
    bytes: Uint8Array;
    name?: string;
}>>;
/**
 * Get gateway URL for a CID
 */
export declare function getGatewayURL(cid: string | CID, gateway?: string): string;
/**
 * Get all gateway URLs for a CID
 */
export declare function getAllGatewayURLs(cid: string | CID): string[];
/**
 * Extract CID from gateway URL
 */
export declare function extractCIDFromURL(url: string): string | null;
/**
 * Create a simple directory structure for multiple files
 */
export interface DirectoryEntry {
    path: string;
    content: Uint8Array;
    cid?: CID;
}
/**
 * Build a directory manifest
 */
export declare function buildDirectoryManifest(entries: DirectoryEntry[]): Promise<{
    manifest: Record<string, {
        cid: string;
        size: number;
    }>;
    rootCID: CID;
}>;
export { CID, raw, dagCbor, sha256, };
//# sourceMappingURL=car.d.ts.map