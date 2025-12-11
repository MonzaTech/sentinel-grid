"use strict";
/**
 * Sentinel Grid - Alert Manager
 * Handles alert configuration, triggering, and notifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManager = void 0;
const SeededRandom_1 = require("./SeededRandom");
// ============================================================================
// Default Configurations
// ============================================================================
const DEFAULT_ALERT_CONFIGS = [
    {
        id: 'alert_critical_risk',
        name: 'Critical Risk Threshold',
        enabled: true,
        conditions: [
            { metric: 'riskScore', operator: 'gt', value: 0.8 },
        ],
        actions: [
            { type: 'log', target: 'system' },
            { type: 'webhook', target: '/api/alerts' },
        ],
        cooldownMinutes: 5,
    },
    {
        id: 'alert_prediction_urgent',
        name: 'Urgent Prediction',
        enabled: true,
        conditions: [
            { metric: 'hoursToEvent', operator: 'lt', value: 6 },
            { metric: 'probability', operator: 'gt', value: 0.7 },
        ],
        actions: [
            { type: 'log', target: 'system' },
        ],
        cooldownMinutes: 15,
    },
    {
        id: 'alert_cascade_detected',
        name: 'Cascade Event Detected',
        enabled: true,
        conditions: [
            { metric: 'type', operator: 'eq', value: 1 }, // cascade_failure enum
        ],
        actions: [
            { type: 'log', target: 'system' },
            { type: 'webhook', target: '/api/cascade-alert' },
        ],
        cooldownMinutes: 10,
    },
    {
        id: 'alert_system_degradation',
        name: 'System Health Degradation',
        enabled: true,
        conditions: [
            { metric: 'systemHealth', operator: 'lt', value: 0.6 },
        ],
        actions: [
            { type: 'log', target: 'system' },
        ],
        cooldownMinutes: 30,
    },
];
// ============================================================================
// Alert Manager Class
// ============================================================================
class AlertManager {
    constructor(seed = 99999) {
        this.configs = new Map();
        this.alerts = [];
        this.cooldowns = new Map();
        this.rng = new SeededRandom_1.SeededRandom(seed);
        // Load default configurations
        DEFAULT_ALERT_CONFIGS.forEach((config) => {
            this.configs.set(config.id, config);
        });
    }
    // ==========================================================================
    // Configuration Management
    // ==========================================================================
    /**
     * Load configurations (from storage or defaults)
     */
    async loadConfigurations() {
        // In a real implementation, this would load from database/storage
        // For now, configs are loaded in constructor
    }
    /**
     * Get all configurations
     */
    getConfigurations() {
        return Array.from(this.configs.values());
    }
    /**
     * Get a specific configuration
     */
    getConfiguration(id) {
        return this.configs.get(id);
    }
    /**
     * Add or update a configuration
     */
    setConfiguration(config) {
        this.configs.set(config.id, config);
    }
    /**
     * Remove a configuration
     */
    removeConfiguration(id) {
        return this.configs.delete(id);
    }
    /**
     * Enable/disable a configuration
     */
    toggleConfiguration(id, enabled) {
        const config = this.configs.get(id);
        if (config) {
            config.enabled = enabled;
            return true;
        }
        return false;
    }
    // ==========================================================================
    // Alert Generation
    // ==========================================================================
    /**
     * Check predictions against alert configurations
     */
    async checkPredictionsForAlerts(predictions) {
        const triggeredAlerts = [];
        const now = new Date();
        for (const prediction of predictions) {
            for (const [configId, config] of this.configs) {
                if (!config.enabled)
                    continue;
                // Check cooldown
                const lastTriggered = this.cooldowns.get(configId);
                if (lastTriggered) {
                    const cooldownMs = config.cooldownMinutes * 60 * 1000;
                    if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
                        continue;
                    }
                }
                // Check conditions
                const conditionsMet = this.evaluateConditions(config.conditions, prediction);
                if (conditionsMet) {
                    const alert = this.createAlertFromPrediction(prediction, config);
                    triggeredAlerts.push(alert);
                    this.alerts.push(alert);
                    // Update cooldown
                    this.cooldowns.set(configId, now);
                    config.lastTriggered = now;
                    // Execute actions
                    await this.executeActions(config.actions, alert);
                }
            }
        }
        return triggeredAlerts;
    }
    /**
     * Check system state against alert configurations
     */
    async checkSystemStateForAlerts(state, nodes) {
        const triggeredAlerts = [];
        const now = new Date();
        for (const [configId, config] of this.configs) {
            if (!config.enabled)
                continue;
            // Check cooldown
            const lastTriggered = this.cooldowns.get(configId);
            if (lastTriggered) {
                const cooldownMs = config.cooldownMinutes * 60 * 1000;
                if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
                    continue;
                }
            }
            // Check system-level conditions
            const conditionsMet = this.evaluateSystemConditions(config.conditions, state);
            if (conditionsMet) {
                const alert = this.createAlertFromSystemState(state, config);
                triggeredAlerts.push(alert);
                this.alerts.push(alert);
                this.cooldowns.set(configId, now);
                config.lastTriggered = now;
                await this.executeActions(config.actions, alert);
            }
        }
        // Check node-level alerts
        for (const node of Object.values(nodes)) {
            for (const [configId, config] of this.configs) {
                if (!config.enabled)
                    continue;
                const lastTriggered = this.cooldowns.get(`${configId}_${node.id}`);
                if (lastTriggered) {
                    const cooldownMs = config.cooldownMinutes * 60 * 1000;
                    if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
                        continue;
                    }
                }
                const conditionsMet = this.evaluateNodeConditions(config.conditions, node);
                if (conditionsMet) {
                    const alert = this.createAlertFromNode(node, config);
                    triggeredAlerts.push(alert);
                    this.alerts.push(alert);
                    this.cooldowns.set(`${configId}_${node.id}`, now);
                    await this.executeActions(config.actions, alert);
                }
            }
        }
        return triggeredAlerts;
    }
    // ==========================================================================
    // Alert Management
    // ==========================================================================
    /**
     * Get all alerts
     */
    getAlerts(status) {
        if (status) {
            return this.alerts.filter((a) => a.status === status);
        }
        return [...this.alerts];
    }
    /**
     * Get alert by ID
     */
    getAlert(id) {
        return this.alerts.find((a) => a.id === id);
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(id, acknowledgedBy) {
        const alert = this.alerts.find((a) => a.id === id);
        if (alert && alert.status === 'active') {
            alert.status = 'acknowledged';
            alert.acknowledgedAt = new Date();
            alert.acknowledgedBy = acknowledgedBy;
            return true;
        }
        return false;
    }
    /**
     * Resolve an alert
     */
    resolveAlert(id) {
        const alert = this.alerts.find((a) => a.id === id);
        if (alert && alert.status !== 'resolved') {
            alert.status = 'resolved';
            alert.resolvedAt = new Date();
            return true;
        }
        return false;
    }
    /**
     * Clear old/resolved alerts
     */
    clearOldAlerts(maxAgeHours = 24) {
        const cutoff = new Date(Date.now() - maxAgeHours * 3600000);
        const before = this.alerts.length;
        this.alerts = this.alerts.filter((a) => a.createdAt > cutoff || a.status === 'active');
        return before - this.alerts.length;
    }
    // ==========================================================================
    // Private Methods
    // ==========================================================================
    evaluateConditions(conditions, prediction) {
        return conditions.every((condition) => {
            const value = this.getPredictionMetricValue(prediction, condition.metric);
            return this.compareValues(value, condition.operator, condition.value);
        });
    }
    evaluateSystemConditions(conditions, state) {
        return conditions.every((condition) => {
            const value = this.getSystemMetricValue(state, condition.metric);
            if (value === undefined)
                return false;
            return this.compareValues(value, condition.operator, condition.value);
        });
    }
    evaluateNodeConditions(conditions, node) {
        return conditions.every((condition) => {
            const value = this.getNodeMetricValue(node, condition.metric);
            if (value === undefined)
                return false;
            return this.compareValues(value, condition.operator, condition.value);
        });
    }
    getPredictionMetricValue(prediction, metric) {
        switch (metric) {
            case 'probability':
                return prediction.probability;
            case 'hoursToEvent':
                return prediction.hoursToEvent;
            case 'confidence':
                return prediction.confidence;
            case 'type':
                return prediction.type;
            case 'severity':
                return prediction.severity;
            default:
                return undefined;
        }
    }
    getSystemMetricValue(state, metric) {
        switch (metric) {
            case 'systemHealth':
                return state.avgHealth;
            case 'maxRisk':
                return state.maxRisk;
            case 'loadRatio':
                return state.loadRatio;
            case 'criticalCount':
                return state.criticalNodes.length;
            default:
                return undefined;
        }
    }
    getNodeMetricValue(node, metric) {
        switch (metric) {
            case 'riskScore':
                return node.riskScore;
            case 'health':
                return node.health;
            case 'loadRatio':
                return node.loadRatio;
            case 'temperature':
                return node.temperature;
            default:
                return undefined;
        }
    }
    compareValues(actual, operator, expected) {
        if (actual === undefined)
            return false;
        const numActual = typeof actual === 'string' ? 0 : actual;
        switch (operator) {
            case 'gt':
                return numActual > expected;
            case 'gte':
                return numActual >= expected;
            case 'lt':
                return numActual < expected;
            case 'lte':
                return numActual <= expected;
            case 'eq':
                return actual === expected || numActual === expected;
            default:
                return false;
        }
    }
    createAlertFromPrediction(prediction, config) {
        const severityMap = {
            critical: 'critical',
            high: 'error',
            medium: 'warning',
            low: 'info',
        };
        return {
            id: `alert_${this.rng.nextUUID()}`,
            predictionId: prediction.id,
            type: 'prediction_triggered',
            severity: severityMap[prediction.severity] || 'warning',
            title: `${config.name}: ${prediction.nodeName}`,
            message: `${prediction.type} predicted for ${prediction.nodeName} within ${prediction.hoursToEvent.toFixed(1)} hours (${(prediction.probability * 100).toFixed(0)}% probability)`,
            nodeIds: [prediction.nodeId],
            status: 'active',
            createdAt: new Date(),
        };
    }
    createAlertFromSystemState(state, config) {
        return {
            id: `alert_${this.rng.nextUUID()}`,
            type: 'system_degradation',
            severity: state.avgHealth < 0.4 ? 'critical' : 'warning',
            title: config.name,
            message: `System health at ${(state.avgHealth * 100).toFixed(0)}%. ${state.criticalNodes.length} critical nodes detected.`,
            nodeIds: state.criticalNodes,
            status: 'active',
            createdAt: new Date(),
        };
    }
    createAlertFromNode(node, config) {
        return {
            id: `alert_${this.rng.nextUUID()}`,
            type: 'threshold_breach',
            severity: node.riskScore > 0.9 ? 'critical' : node.riskScore > 0.8 ? 'error' : 'warning',
            title: `${config.name}: ${node.name}`,
            message: `Node ${node.name} has risk score ${(node.riskScore * 100).toFixed(0)}% and health ${(node.health * 100).toFixed(0)}%`,
            nodeIds: [node.id],
            status: 'active',
            createdAt: new Date(),
        };
    }
    async executeActions(actions, alert) {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'log':
                        console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.message}`);
                        break;
                    case 'webhook':
                        // In production, this would make an HTTP request
                        console.log(`[WEBHOOK] Would POST to ${action.target}:`, alert);
                        break;
                    case 'email':
                        // In production, this would send an email
                        console.log(`[EMAIL] Would send to ${action.target}:`, alert.title);
                        break;
                    case 'slack':
                        // In production, this would post to Slack
                        console.log(`[SLACK] Would post to ${action.target}:`, alert.message);
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to execute action ${action.type}:`, error);
            }
        }
    }
}
exports.AlertManager = AlertManager;
exports.default = AlertManager;
//# sourceMappingURL=AlertManager.js.map