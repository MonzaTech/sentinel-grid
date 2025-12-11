/**
 * Sentinel Grid Backend - Configuration
 * Environment variables and app settings
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenvConfig();

// Configuration schema with validation
const configSchema = z.object({
  // Server
  PORT: z.string().default('4000'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security
  API_KEY: z.string().default('demo-api-key-change-in-production'),
  CORS_ORIGIN: z.string().default('*'),
  
  // Database
  DB_PATH: z.string().default('./data/sentinel.db'),
  
  // Simulation
  SIMULATION_SEED: z.string().default('12345'),
  NODE_COUNT: z.string().default('200'),
  TICK_INTERVAL_MS: z.string().default('3000'),
  PREDICTION_INTERVAL_MS: z.string().default('10000'),
  
  // IPFS / Web3.Storage
  WEB3STORAGE_TOKEN: z.string().optional(),
  IPFS_LOCAL: z.string().default('false'),
  IPFS_API_URL: z.string().default('http://localhost:5001'),
  
  // Blockchain
  ENABLE_BLOCKCHAIN: z.string().default('false'),
  HARDHAT_RPC: z.string().default('http://localhost:8545'),
  BASE_RPC_URL: z.string().optional(),
  OPTIMISM_RPC_URL: z.string().optional(),
  PRIVATE_KEY: z.string().optional(),
  CONTRACT_ADDRESS: z.string().optional(),
  
  // Integrity
  PIN_HMAC_KEY: z.string().default('demo-hmac-key-change-in-production'),
  
  // Scheduler
  ANCHOR_CRON: z.string().default('*/5 * * * *'), // Every 5 minutes
  AUTO_ANCHOR: z.string().default('false'),
});

// Parse and validate
const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

// Export typed configuration
export const config = {
  // Server
  port: parseInt(env.PORT, 10),
  host: env.HOST,
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Security
  apiKey: env.API_KEY,
  corsOrigin: env.CORS_ORIGIN,
  
  // Database
  dbPath: env.DB_PATH,
  
  // Simulation
  simulation: {
    seed: parseInt(env.SIMULATION_SEED, 10),
    nodeCount: parseInt(env.NODE_COUNT, 10),
    tickIntervalMs: parseInt(env.TICK_INTERVAL_MS, 10),
    predictionIntervalMs: parseInt(env.PREDICTION_INTERVAL_MS, 10),
  },
  
  // IPFS
  ipfs: {
    web3StorageToken: env.WEB3STORAGE_TOKEN,
    useLocal: env.IPFS_LOCAL === 'true',
    localApiUrl: env.IPFS_API_URL,
  },
  
  // Blockchain
  blockchainEnabled: env.ENABLE_BLOCKCHAIN === 'true',
  blockchain: {
    hardhatRpc: env.HARDHAT_RPC,
    baseRpcUrl: env.BASE_RPC_URL,
    optimismRpcUrl: env.OPTIMISM_RPC_URL,
    privateKey: env.PRIVATE_KEY,
    contractAddress: env.CONTRACT_ADDRESS,
  },
  
  // Alias for contract service
  chain: {
    hardhatRpc: env.HARDHAT_RPC,
    baseRpc: env.BASE_RPC_URL,
    privateKey: env.PRIVATE_KEY,
    contractAddress: env.CONTRACT_ADDRESS,
  },
  
  // Integrity
  hmacKey: env.PIN_HMAC_KEY,
  
  // Scheduler
  scheduler: {
    anchorCron: env.ANCHOR_CRON,
    autoAnchor: env.AUTO_ANCHOR === 'true',
  },
} as const;

export type Config = typeof config;
