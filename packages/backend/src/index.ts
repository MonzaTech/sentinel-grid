/**
 * Sentinel Grid Backend - Main Entry Point
 */

import { createServer } from 'http';
import { config } from './config';
import { createApp } from './app';
import { initializeSchema, closeDatabase } from './db/index';
import { WebSocketManager } from './websocket/index';
import { getSimulation } from './services/simulation';

async function main(): Promise<void> {
  console.log('');
  console.log('🛡️  SENTINEL GRID BACKEND');
  console.log('═'.repeat(40));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Port: ${config.port}`);
  console.log('');

  // Initialize database
  initializeSchema();

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = createServer(app);

  // Initialize WebSocket
  const wsManager = new WebSocketManager(server);

  // Initialize simulation (lazy - doesn't start automatically)
  const simulation = getSimulation();
  console.log(`✓ Simulation ready (${simulation.getSystemState().totalNodes} nodes)`);

  // Always auto-start simulation (needed for frontend to work)
  simulation.start();

  // Start server
  server.listen(config.port, config.host, () => {
    console.log('');
    console.log(`🚀 Server running at http://${config.host}:${config.port}`);
    console.log(`   API: http://localhost:${config.port}/api`);
    console.log(`   WebSocket: ws://localhost:${config.port}/ws/updates`);
    console.log(`   Health: http://localhost:${config.port}/health`);
    console.log(`   Metrics: http://localhost:${config.port}/api/system/metrics`);
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down...`);
    
    // Stop simulation
    simulation.stop();
    
    // Close WebSocket
    wsManager.close();
    
    // Close database
    closeDatabase();
    
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
