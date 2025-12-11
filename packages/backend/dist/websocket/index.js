"use strict";
/**
 * Sentinel Grid Backend - WebSocket Server
 * Real-time updates for simulation state, predictions, alerts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const ws_1 = require("ws");
const simulation_js_1 = require("../services/simulation.js");
const index_js_1 = require("../stores/index.js");
class WebSocketManager {
    constructor(server) {
        this.clients = new Set();
        this.pingInterval = null;
        this.wss = new ws_1.WebSocketServer({
            server,
            path: '/ws/updates',
        });
        this.setupServer();
        this.setupSimulationEvents();
        this.startPingInterval();
        console.log('✓ WebSocket server initialized at /ws/updates');
    }
    setupServer() {
        this.wss.on('connection', (ws) => {
            const client = ws;
            client.isAlive = true;
            client.subscriptions = new Set(['tick', 'prediction', 'alert', 'cascade', 'mitigation', 'incident']);
            this.clients.add(client);
            console.log(`WebSocket client connected (total: ${this.clients.size})`);
            // Send initial state
            const sim = (0, simulation_js_1.getSimulation)();
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
                }
                catch (error) {
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
    handleMessage(client, message) {
        switch (message.type) {
            case 'subscribe':
                if (Array.isArray(message.channels)) {
                    message.channels.forEach((ch) => client.subscriptions.add(ch));
                    this.send(client, {
                        type: 'subscribed',
                        data: { channels: Array.from(client.subscriptions) },
                        timestamp: new Date().toISOString(),
                    });
                }
                break;
            case 'unsubscribe':
                if (Array.isArray(message.channels)) {
                    message.channels.forEach((ch) => client.subscriptions.delete(ch));
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
                const sim = (0, simulation_js_1.getSimulation)();
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
    setupSimulationEvents() {
        const sim = (0, simulation_js_1.getSimulation)();
        // Tick events (throttled to avoid flooding)
        let lastTickBroadcast = 0;
        sim.on('tick', (state) => {
            const now = Date.now();
            if (now - lastTickBroadcast < 1000)
                return; // Max 1/sec
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
            // Log the alert
            index_js_1.logStore.addSystemLog('alert', `Alert: ${alert.title || alert.message}`, {
                alertId: alert.id,
                severity: alert.severity,
            });
        });
        // Cascade events - send full data for timeline AND create incident
        sim.on('cascade', (event) => {
            // Create or find incident for this cascade
            let incident = index_js_1.incidentStore.findByCascadeEventId(event.id);
            if (!incident) {
                incident = index_js_1.incidentStore.createFromCascade(event.id, event.originNode, event.affectedNodes, event.severity || event.impactScore || 0.5);
            }
            // Broadcast cascade
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
                    incidentId: incident.id,
                },
                timestamp: new Date().toISOString(),
            });
            // Broadcast incident creation
            this.broadcast('incident', {
                type: 'incident',
                data: incident,
                timestamp: new Date().toISOString(),
            });
            // Log the cascade
            index_js_1.logStore.addSystemLog('incident', `Cascade failure: ${event.affectedNodes.length} nodes affected`, {
                cascadeId: event.id,
                incidentId: incident.id,
                originNode: event.originNode,
                impactScore: event.impactScore,
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
    startPingInterval() {
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
    send(client, message) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }
    broadcast(channel, message) {
        this.clients.forEach((client) => {
            if (client.subscriptions.has(channel) && client.readyState === ws_1.WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
    getClientCount() {
        return this.clients.size;
    }
    close() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.wss.close();
    }
}
exports.WebSocketManager = WebSocketManager;
//# sourceMappingURL=index.js.map