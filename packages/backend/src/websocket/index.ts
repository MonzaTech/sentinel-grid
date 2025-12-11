/**
 * Sentinel Grid Backend - WebSocket Server
 * Real-time updates for simulation state, predictions, alerts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getSimulation } from '../services/simulation.js';

interface WSMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<string>;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<ExtWebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/updates',
    });

    this.setupServer();
    this.setupSimulationEvents();
    this.startPingInterval();

    console.log('✓ WebSocket server initialized at /ws/updates');
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as ExtWebSocket;
      client.isAlive = true;
      client.subscriptions = new Set(['tick', 'prediction', 'alert', 'cascade', 'mitigation']);
      
      this.clients.add(client);
      console.log(`WebSocket client connected (total: ${this.clients.size})`);

      // Send initial state
      const sim = getSimulation();
      this.send(client, {
        type: 'connected',
        data: {
          message: 'Connected to Sentinel Grid WebSocket',
          state: sim.getState(),
        },
        timestamp: new Date().toISOString(),
      });

      // Handle messages
      client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          this.send(client, {
            type: 'error',
            data: { message: 'Invalid JSON message' },
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Handle pong
      client.on('pong', () => {
        client.isAlive = true;
      });

      // Handle close
      client.on('close', () => {
        this.clients.delete(client);
        console.log(`WebSocket client disconnected (total: ${this.clients.size})`);
      });

      // Handle errors
      client.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(client);
      });
    });
  }

  private handleMessage(client: ExtWebSocket, message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'subscribe':
        if (Array.isArray(message.channels)) {
          message.channels.forEach((ch: string) => client.subscriptions.add(ch));
          this.send(client, {
            type: 'subscribed',
            data: { channels: Array.from(client.subscriptions) },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'unsubscribe':
        if (Array.isArray(message.channels)) {
          message.channels.forEach((ch: string) => client.subscriptions.delete(ch));
          this.send(client, {
            type: 'unsubscribed',
            data: { channels: Array.from(client.subscriptions) },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'ping':
        this.send(client, {
          type: 'pong',
          data: {},
          timestamp: new Date().toISOString(),
        });
        break;

      case 'getState':
        const sim = getSimulation();
        this.send(client, {
          type: 'state',
          data: sim.getState(),
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        this.send(client, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
          timestamp: new Date().toISOString(),
        });
    }
  }

  private setupSimulationEvents(): void {
    const sim = getSimulation();

    // Tick events (throttled to avoid flooding)
    let lastTickBroadcast = 0;
    sim.on('tick', (state) => {
      const now = Date.now();
      if (now - lastTickBroadcast < 1000) return; // Max 1/sec
      lastTickBroadcast = now;

      this.broadcast('tick', {
        type: 'tick',
        data: {
          systemState: state.systemState,
          weather: state.weather,
          isRunning: state.isRunning,
          tickCount: state.tickCount,
          nodes: state.nodes, // Include nodes for real-time status updates
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Prediction events
    sim.on('prediction', (predictions) => {
      this.broadcast('prediction', {
        type: 'predictions',
        data: {
          count: predictions.length,
          predictions: predictions.slice(0, 10),
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Alert events
    sim.on('alert', (alert) => {
      this.broadcast('alert', {
        type: 'alert',
        data: alert,
        timestamp: new Date().toISOString(),
      });
    });

    // Cascade events - send full data for timeline
    sim.on('cascade', (event) => {
      this.broadcast('cascade', {
        type: 'cascade',
        data: {
          id: event.id,
          originNode: event.originNode,
          severity: event.severity,
          affectedNodes: event.affectedNodes,
          propagationPath: event.propagationPath || [],
          impactScore: event.impactScore,
          totalDamage: event.totalDamage,
          mitigated: event.mitigated,
          startedAt: event.startedAt || new Date().toISOString(),
          endedAt: event.endedAt,
          startTime: event.startTime || event.startedAt || new Date().toISOString(),
          endTime: event.endTime || event.endedAt,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Mitigation events
    sim.on('mitigation', (result) => {
      this.broadcast('mitigation', {
        type: 'mitigation',
        data: result,
        timestamp: new Date().toISOString(),
      });
    });

    // State change events
    sim.on('stateChange', (state) => {
      this.broadcast('tick', {
        type: 'stateChange',
        data: {
          isRunning: state.isRunning,
          tickCount: state.tickCount,
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private startPingInterval(): void {
    // Ping clients every 30 seconds
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }

  private send(client: ExtWebSocket, message: WSMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private broadcast(channel: string, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.subscriptions.has(channel) && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss.close();
  }
}
