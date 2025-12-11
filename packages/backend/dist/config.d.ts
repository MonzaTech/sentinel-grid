/**
 * Sentinel Grid Backend - Configuration
 * Environment variables and app settings
 */
export declare const config: {
    readonly port: number;
    readonly host: string;
    readonly nodeEnv: "development" | "production" | "test";
    readonly isDev: boolean;
    readonly isProd: boolean;
    readonly isTest: boolean;
    readonly apiKey: string;
    readonly corsOrigin: string;
    readonly dbPath: string;
    readonly simulation: {
        readonly seed: number;
        readonly nodeCount: number;
        readonly tickIntervalMs: number;
        readonly predictionIntervalMs: number;
    };
    readonly ipfs: {
        readonly web3StorageToken: string | undefined;
        readonly useLocal: boolean;
        readonly localApiUrl: string;
    };
    readonly blockchainEnabled: boolean;
    readonly blockchain: {
        readonly hardhatRpc: string;
        readonly baseRpcUrl: string | undefined;
        readonly optimismRpcUrl: string | undefined;
        readonly privateKey: string | undefined;
        readonly contractAddress: string | undefined;
    };
    readonly chain: {
        readonly hardhatRpc: string;
        readonly baseRpc: string | undefined;
        readonly privateKey: string | undefined;
        readonly contractAddress: string | undefined;
    };
    readonly hmacKey: string;
    readonly scheduler: {
        readonly anchorCron: string;
        readonly autoAnchor: boolean;
    };
};
export type Config = typeof config;
