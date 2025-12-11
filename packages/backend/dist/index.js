"use strict";
/**
 * Sentinel Grid Backend - Main Entry Point
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const config_1 = require("./config");
const app_1 = require("./app");
const index_1 = require("./db/index");
const index_2 = require("./websocket/index");
const simulation_1 = require("./services/simulation");
async function main() {
    console.log('');
    console.log('🛡️  SENTINEL GRID BACKEND');
    console.log('═'.repeat(40));
    console.log(`Environment: ${config_1.config.nodeEnv}`);
    console.log(`Port: ${config_1.config.port}`);
    console.log('');
    // Initialize database
    (0, index_1.initializeSchema)();
    // Create Express app
    const app = (0, app_1.createApp)();
    // Create HTTP server
    const server = (0, http_1.createServer)(app);
    // Initialize WebSocket
    const wsManager = new index_2.WebSocketManager(server);
    // Initialize simulation (lazy - doesn't start automatically)
    const simulation = (0, simulation_1.getSimulation)();
    console.log(`✓ Simulation ready (${simulation.getSystemState().totalNodes} nodes)`);
    // Always auto-start simulation (needed for frontend to work)
    simulation.start();
    // Start server
    server.listen(config_1.config.port, config_1.config.host, () => {
        console.log('');
        console.log(`🚀 Server running at http://${config_1.config.host}:${config_1.config.port}`);
        console.log(`   API: http://localhost:${config_1.config.port}/api`);
        console.log(`   WebSocket: ws://localhost:${config_1.config.port}/ws/updates`);
        console.log(`   Health: http://localhost:${config_1.config.port}/health`);
        console.log(`   Metrics: http://localhost:${config_1.config.port}/api/system/metrics`);
        console.log('');
    });
    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`\n${signal} received, shutting down...`);
        // Stop simulation
        simulation.stop();
        // Close WebSocket
        wsManager.close();
        // Close database
        (0, index_1.closeDatabase)();
        // Close server
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
        // Force exit after 10s
        setTimeout(() => {
            console.error('Forced shutdown');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map