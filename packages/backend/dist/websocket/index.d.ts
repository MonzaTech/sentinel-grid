/**
 * Sentinel Grid Backend - WebSocket Server
 * Real-time updates for simulation state, predictions, alerts
 */
import { Server } from 'http';
export declare class WebSocketManager {
    private wss;
    private clients;
    private pingInterval;
    constructor(server: Server);
    private setupServer;
    private handleMessage;
    private setupSimulationEvents;
    private startPingInterval;
    private send;
    private broadcast;
    getClientCount(): number;
    close(): void;
}
