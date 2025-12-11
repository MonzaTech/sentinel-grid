"use strict";
/**
 * CAR (Content Addressable aRchive) utilities
 *
 * Utilities for creating and parsing CAR files for IPFS uploads.
 * CAR files are the preferred format for Web3.Storage uploads.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = exports.dagCbor = exports.raw = exports.CID = void 0;
exports.createCID = createCID;
exports.createJSONCID = createJSONCID;
exports.parseCID = parseCID;
exports.isValidCID = isValidCID;
exports.encodeJSON = encodeJSON;
exports.decodeJSON = decodeJSON;
exports.encodeString = encodeString;
exports.decodeString = decodeString;
exports.createSimpleCAR = createSimpleCAR;
exports.createBlocks = createBlocks;
exports.getGatewayURL = getGatewayURL;
exports.getAllGatewayURLs = getAllGatewayURLs;
exports.extractCIDFromURL = extractCIDFromURL;
exports.buildDirectoryManifest = buildDirectoryManifest;
const cid_1 = require("multiformats/cid");
Object.defineProperty(exports, "CID", { enumerable: true, get: function () { return cid_1.CID; } });
const raw = __importStar(require("multiformats/codecs/raw"));
exports.raw = raw;
const dagCbor = __importStar(require("multiformats/codecs/json"));
exports.dagCbor = dagCbor;
const sha2_1 = require("multiformats/hashes/sha2");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return sha2_1.sha256; } });
// ============================================================================
// CID Utilities
// ============================================================================
/**
 * Create a CID from raw bytes
 */
async function createCID(bytes) {
    const hash = await sha2_1.sha256.digest(bytes);
    return cid_1.CID.create(1, raw.code, hash);
}
/**
 * Create a CID from JSON data
 */
async function createJSONCID(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const hash = await sha2_1.sha256.digest(bytes);
    return cid_1.CID.create(1, dagCbor.code, hash);
}
/**
 * Parse a CID string
 */
function parseCID(cidString) {
    return cid_1.CID.parse(cidString);
}
/**
 * Check if string is valid CID
 */
function isValidCID(cidString) {
    try {
        cid_1.CID.parse(cidString);
        return true;
    }
    catch {
        return false;
    }
}
// ============================================================================
// Data Encoding
// ============================================================================
/**
 * Encode object as CBOR-like JSON bytes
 */
function encodeJSON(data) {
    return new TextEncoder().encode(JSON.stringify(data));
}
/**
 * Decode bytes as JSON
 */
function decodeJSON(bytes) {
    return JSON.parse(new TextDecoder().decode(bytes));
}
/**
 * Encode string as bytes
 */
function encodeString(str) {
    return new TextEncoder().encode(str);
}
/**
 * Decode bytes as string
 */
function decodeString(bytes) {
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
async function createSimpleCAR(data) {
    const bytes = encodeJSON(data);
    const cid = await createJSONCID(data);
    return { cid, bytes };
}
/**
 * Create multiple blocks for batch upload
 */
async function createBlocks(items) {
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
function getGatewayURL(cid, gateway) {
    const cidString = typeof cid === 'string' ? cid : cid.toString();
    const baseGateway = gateway || IPFS_GATEWAYS[0];
    return baseGateway.endsWith('/')
        ? `${baseGateway}${cidString}`
        : `${baseGateway}/${cidString}`;
}
/**
 * Get all gateway URLs for a CID
 */
function getAllGatewayURLs(cid) {
    return IPFS_GATEWAYS.map(gateway => getGatewayURL(cid, gateway));
}
/**
 * Extract CID from gateway URL
 */
function extractCIDFromURL(url) {
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
/**
 * Build a directory manifest
 */
async function buildDirectoryManifest(entries) {
    const manifest = {};
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
//# sourceMappingURL=car.js.map