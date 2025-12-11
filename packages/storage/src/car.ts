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

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// CID Utilities
// ============================================================================

/**
 * Create a CID from raw bytes
 */
export async function createCID(bytes: Uint8Array): Promise<CID> {
  const hash = await sha256.digest(bytes);
  return CID.create(1, raw.code, hash);
}

/**
 * Create a CID from JSON data
 */
export async function createJSONCID(data: unknown): Promise<CID> {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const hash = await sha256.digest(bytes);
  return CID.create(1, dagCbor.code, hash);
}

/**
 * Parse a CID string
 */
export function parseCID(cidString: string): CID {
  return CID.parse(cidString);
}

/**
 * Check if string is valid CID
 */
export function isValidCID(cidString: string): boolean {
  try {
    CID.parse(cidString);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Data Encoding
// ============================================================================

/**
 * Encode object as CBOR-like JSON bytes
 */
export function encodeJSON(data: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data));
}

/**
 * Decode bytes as JSON
 */
export function decodeJSON<T = unknown>(bytes: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Encode string as bytes
 */
export function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decode bytes as string
 */
export function decodeString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// ============================================================================
// Simple CAR Creation (without full CarWriter)
// ============================================================================

/**
 * Create a simple single-block CAR structure
 * 
 * Note: This creates a minimal CAR-like structure.
 * For full CAR support, use @ipld/car package.
 */
export async function createSimpleCAR(data: unknown): Promise<{
  cid: CID;
  bytes: Uint8Array;
}> {
  const bytes = encodeJSON(data);
  const cid = await createJSONCID(data);
  
  return { cid, bytes };
}

/**
 * Create multiple blocks for batch upload
 */
export async function createBlocks(
  items: Array<{ data: unknown; name?: string }>
): Promise<Array<{ cid: CID; bytes: Uint8Array; name?: string }>> {
  const blocks = [];
  
  for (const item of items) {
    const bytes = encodeJSON(item.data);
    const cid = await createJSONCID(item.data);
    blocks.push({ cid, bytes, name: item.name });
  }
  
  return blocks;
}

// ============================================================================
// Gateway URL Utilities
// ============================================================================

const IPFS_GATEWAYS = [
  'https://w3s.link/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

/**
 * Get gateway URL for a CID
 */
export function getGatewayURL(cid: string | CID, gateway?: string): string {
  const cidString = typeof cid === 'string' ? cid : cid.toString();
  const baseGateway = gateway || IPFS_GATEWAYS[0];
  return baseGateway.endsWith('/') 
    ? `${baseGateway}${cidString}` 
    : `${baseGateway}/${cidString}`;
}

/**
 * Get all gateway URLs for a CID
 */
export function getAllGatewayURLs(cid: string | CID): string[] {
  return IPFS_GATEWAYS.map(gateway => getGatewayURL(cid, gateway));
}

/**
 * Extract CID from gateway URL
 */
export function extractCIDFromURL(url: string): string | null {
  // Match common gateway patterns
  const patterns = [
    /\/ipfs\/([a-zA-Z0-9]+)/,
    /\.ipfs\.w3s\.link/,
    /\.ipfs\.dweb\.link/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Try to extract subdomain CID
  const subdomainMatch = url.match(/https?:\/\/([a-zA-Z0-9]+)\.ipfs\./);
  if (subdomainMatch) {
    return subdomainMatch[1];
  }
  
  return null;
}

// ============================================================================
// UnixFS-like Directory Structure
// ============================================================================

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
export async function buildDirectoryManifest(
  entries: DirectoryEntry[]
): Promise<{
  manifest: Record<string, { cid: string; size: number }>;
  rootCID: CID;
}> {
  const manifest: Record<string, { cid: string; size: number }> = {};
  
  for (const entry of entries) {
    const cid = entry.cid || await createCID(entry.content);
    manifest[entry.path] = {
      cid: cid.toString(),
      size: entry.content.length,
    };
  }
  
  const rootCID = await createJSONCID(manifest);
  
  return { manifest, rootCID };
}

// ============================================================================
// Exports
// ============================================================================

export {
  CID,
  raw,
  dagCbor,
  sha256,
};
