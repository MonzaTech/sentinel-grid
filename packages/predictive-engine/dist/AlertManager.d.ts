/**
 * Sentinel Grid - Alert Manager
 * Handles alert configuration, triggering, and notifications
 */
import { Alert, AlertStatus, AlertConfig, Prediction, Node, SystemState } from './types';
export declare class AlertManager {
    private configs;
    private alerts;
    private cooldowns;
    private rng;
    constructor(seed?: number);
    /**
     * Load configurations (from storage or defaults)
     */
    loadConfigurations(): Promise<void>;
    /**
     * Get all configurations
     */
    getConfigurations(): AlertConfig[];
    /**
     * Get a specific configuration
     */
    getConfiguration(id: string): AlertConfig | undefined;
    /**
     * Add or update a configuration
     */
    setConfiguration(config: AlertConfig): void;
    /**
     * Remove a configuration
     */
    removeConfiguration(id: string): boolean;
    /**
     * Enable/disable a configuration
     */
    toggleConfiguration(id: string, enabled: boolean): boolean;
    /**
     * Check predictions against alert configurations
     */
    checkPredictionsForAlerts(predictions: Prediction[]): Promise<Alert[]>;
    /**
     * Check system state against alert configurations
     */
    checkSystemStateForAlerts(state: SystemState, nodes: Record<string, Node>): Promise<Alert[]>;
    /**
     * Get all alerts
     */
    getAlerts(status?: AlertStatus): Alert[];
    /**
     * Get alert by ID
     */
    getAlert(id: string): Alert | undefined;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(id: string, acknowledgedBy?: string): boolean;
    /**
     * Resolve an alert
     */
    resolveAlert(id: string): boolean;
    /**
     * Clear old/resolved alerts
     */
    clearOldAlerts(maxAgeHours?: number): number;
    private evaluateConditions;
    private evaluateSystemConditions;
    private evaluateNodeConditions;
    private getPredictionMetricValue;
    private getSystemMetricValue;
    private getNodeMetricValue;
    private compareValues;
    private createAlertFromPrediction;
    private createAlertFromSystemState;
    private createAlertFromNode;
    private executeActions;
}
export default AlertManager;
//# sourceMappingURL=AlertManager.d.ts.map