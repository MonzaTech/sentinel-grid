"use strict";
/**
 * Demo Controller Service
 * Powers scripted 2-3 minute investor demonstrations
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
exports.runDemo = runDemo;
exports.resetDemo = resetDemo;
exports.getDemoState = getDemoState;
exports.getAvailableDemos = getAvailableDemos;
exports.isDemoRunning = isDemoRunning;
exports.getCurrentStep = getCurrentStep;
exports.skipToStep = skipToStep;
const DigitalTwinService = __importStar(require("./DigitalTwinService.js"));
const ThreatService = __importStar(require("./ThreatService.js"));
const RiskScoringService = __importStar(require("./RiskScoringService.js"));
const MitigationService = __importStar(require("./MitigationService.js"));
const index_js_1 = require("../stores/index.js");
// ============================================================================
// Demo State
// ============================================================================
let demoState = {
    isRunning: false,
    currentStepIndex: -1,
};
let demoTimeouts = [];
let onStepCallback = null;
let onCompleteCallback = null;
// ============================================================================
// Demo Sequences
// ============================================================================
const INVESTOR_DEMO = {
    id: 'investor-demo',
    name: 'Investor Demo - Cascade Prediction',
    description: '2-3 minute demonstration showing cascade failure prediction and mitigation',
    totalDurationMs: 150000, // 2.5 minutes
    steps: [
        {
            id: 'step-1-normal',
            name: 'Normal Operations',
            description: 'System operating normally with all nodes online',
            durationMs: 15000,
            action: {
                type: 'normal',
                params: { resetThreats: true },
            },
            expectedOutcome: 'Grid stable, risk scores low, all nodes green',
        },
        {
            id: 'step-2-anomaly',
            name: 'Anomaly Detected',
            description: 'Load imbalance detected in Central region',
            durationMs: 20000,
            action: {
                type: 'anomaly',
                params: {
                    region: 'Central',
                    type: 'load_spike',
                    severity: 0.4,
                },
            },
            expectedOutcome: 'Warning indicators appear, load ratios increase',
        },
        {
            id: 'step-3-prediction',
            name: 'AI Prediction Generated',
            description: 'Sentinel Grid predicts cascade failure in 4 hours',
            durationMs: 25000,
            action: {
                type: 'prediction',
                params: {
                    type: 'cascade_failure',
                    probability: 0.78,
                    hoursToEvent: 4,
                },
            },
            expectedOutcome: 'High-confidence prediction with contributing factors',
        },
        {
            id: 'step-4-cascade',
            name: 'Cascade Path Visualization',
            description: 'Predicted cascade path shown across regions',
            durationMs: 20000,
            action: {
                type: 'cascade',
                params: {
                    severity: 0.6,
                    showPath: true,
                },
            },
            expectedOutcome: 'Visual cascade path, affected nodes highlighted',
        },
        {
            id: 'step-5-mitigation',
            name: 'Mitigation Recommended',
            description: 'System recommends load shedding and isolation',
            durationMs: 25000,
            action: {
                type: 'mitigation',
                params: {
                    actions: ['load_shed', 'isolate', 'activate_backup'],
                },
            },
            expectedOutcome: 'Mitigation options displayed with risk reduction estimates',
        },
        {
            id: 'step-6-recovery',
            name: 'System Stabilizes',
            description: 'Mitigations applied, risk score decreasing',
            durationMs: 25000,
            action: {
                type: 'recovery',
                params: {},
            },
            expectedOutcome: 'Risk scores drop, nodes return to normal',
        },
        {
            id: 'step-7-summary',
            name: 'Demo Complete',
            description: 'Summary of prediction accuracy and time saved',
            durationMs: 20000,
            action: {
                type: 'normal',
                params: { summary: true },
            },
            expectedOutcome: '48-hour advance warning, $12M potential savings',
        },
    ],
};
const CYBER_ATTACK_DEMO = {
    id: 'cyber-attack-demo',
    name: 'Cyber Attack Detection',
    description: 'Demonstration of cyber attack detection and response',
    totalDurationMs: 120000,
    steps: [
        {
            id: 'cyber-1',
            name: 'Normal Operations',
            description: 'All systems secure',
            durationMs: 10000,
            action: { type: 'normal', params: {} },
            expectedOutcome: 'All cyber health indicators green',
        },
        {
            id: 'cyber-2',
            name: 'Reconnaissance Detected',
            description: 'Anomalous network scanning detected',
            durationMs: 15000,
            action: {
                type: 'anomaly',
                params: { type: 'cyber_recon', severity: 0.3 },
            },
            expectedOutcome: 'Tamper signals increase on perimeter nodes',
        },
        {
            id: 'cyber-3',
            name: 'Attack in Progress',
            description: 'False data injection detected',
            durationMs: 20000,
            action: {
                type: 'cascade',
                params: {
                    threatType: 'cyber_attack',
                    subtype: 'false_data_injection',
                    severity: 0.7,
                },
            },
            expectedOutcome: 'Cyber health drops, compromised status',
        },
        {
            id: 'cyber-4',
            name: 'AI Response',
            description: 'Cyber lockdown recommended',
            durationMs: 20000,
            action: {
                type: 'mitigation',
                params: { actions: ['cyber_lockdown', 'isolate'] },
            },
            expectedOutcome: 'Isolation of affected SCADA systems',
        },
        {
            id: 'cyber-5',
            name: 'Threat Contained',
            description: 'Attack vector isolated',
            durationMs: 20000,
            action: { type: 'recovery', params: {} },
            expectedOutcome: 'System returns to secure state',
        },
    ],
};
const AVAILABLE_DEMOS = {
    'investor-demo': INVESTOR_DEMO,
    'cyber-attack-demo': CYBER_ATTACK_DEMO,
};
// ============================================================================
// Execute Demo Step
// ============================================================================
function executeStep(step, index) {
    demoState.currentStepIndex = index;
    index_js_1.logStore.addSimulationLog('demo', `Executing step: ${step.name}`, {
        stepId: step.id,
        stepIndex: index,
        action: step.action.type,
    });
    const params = step.action.params;
    switch (step.action.type) {
        case 'normal':
            if (params.resetThreats) {
                ThreatService.endAllThreats();
            }
            // Stabilize all nodes
            stabilizeNodes();
            break;
        case 'anomaly':
            createAnomaly(params);
            break;
        case 'prediction':
            generateDemoPrediction(params);
            break;
        case 'cascade':
            triggerDemoCascade(params);
            break;
        case 'mitigation':
            applyDemoMitigation(params);
            break;
        case 'recovery':
            recoverSystem();
            break;
    }
    // Notify callback
    if (onStepCallback) {
        onStepCallback(step, index);
    }
}
// ============================================================================
// Step Implementations
// ============================================================================
function stabilizeNodes() {
    const nodes = DigitalTwinService.getAllNodes();
    nodes.forEach(node => {
        if (node.riskScore > 0.5) {
            DigitalTwinService.applyMitigationToNode(node.id, 'activate_backup');
        }
    });
}
function createAnomaly(params) {
    const region = params.region || 'Central';
    const severity = params.severity || 0.4;
    const type = params.type || 'load_spike';
    const regionNodes = DigitalTwinService.getNodesByRegion(region);
    const targetNodes = regionNodes.slice(0, Math.ceil(regionNodes.length * 0.3));
    targetNodes.forEach(node => {
        if (type === 'load_spike') {
            node.loadRatio = Math.min(0.9, node.loadRatio + severity * 0.3);
            node.riskScore = Math.min(0.7, node.riskScore + severity * 0.2);
        }
        else if (type === 'cyber_recon') {
            node.tamperSignal = Math.min(0.5, node.tamperSignal + severity * 0.3);
            node.latency = Math.min(150, node.latency + severity * 50);
        }
    });
}
function generateDemoPrediction(params) {
    const type = params.type || 'cascade_failure';
    const probability = params.probability || 0.75;
    const hoursToEvent = params.hoursToEvent || 4;
    // Find a high-risk node to attach prediction to
    const nodes = DigitalTwinService.getAllNodes()
        .sort((a, b) => b.riskScore - a.riskScore);
    const targetNode = nodes[0];
    if (!targetNode)
        return;
    // The prediction will be generated naturally by the risk scoring service
    // Just ensure the node is at appropriate risk level
    targetNode.riskScore = Math.max(0.65, targetNode.riskScore);
    targetNode.status = 'degraded';
    // Generate and store prediction
    const prediction = RiskScoringService.generatePrediction(targetNode);
    if (prediction) {
        // Adjust to match demo parameters
        prediction.probability = probability;
        prediction.hoursToEvent = hoursToEvent;
    }
}
function triggerDemoCascade(params) {
    const severity = params.severity || 0.6;
    const threatType = params.threatType;
    const subtype = params.subtype;
    if (threatType === 'cyber_attack') {
        ThreatService.createCyberAttack(null, subtype || 'false_data_injection', severity);
    }
    else {
        // Physical cascade
        const criticalNodes = DigitalTwinService.getCriticalNodes();
        const degradedNodes = DigitalTwinService.getAllNodes()
            .filter(n => n.status === 'degraded');
        const origin = criticalNodes[0] || degradedNodes[0];
        if (origin) {
            ThreatService.createThreat({
                type: 'cascade_origin',
                target: origin.id,
                severity,
                durationSeconds: 60,
            });
        }
    }
}
function applyDemoMitigation(params) {
    const actions = params.actions || ['load_shed'];
    // Get all recommendations and execute them
    const recommendations = MitigationService.getPendingRecommendations();
    recommendations.slice(0, 5).forEach(rec => {
        MitigationService.executeMitigation(rec.nodeId, rec.actionType, 'demo-system');
    });
    // Also mitigate any critical nodes
    const criticalNodes = DigitalTwinService.getCriticalNodes();
    criticalNodes.forEach(node => {
        const action = actions[0] || 'load_shed';
        MitigationService.executeMitigation(node.id, action, 'demo-system');
    });
}
function recoverSystem() {
    ThreatService.endAllThreats();
    const allNodes = DigitalTwinService.getAllNodes();
    allNodes.forEach(node => {
        if (node.status === 'critical' || node.status === 'degraded') {
            DigitalTwinService.applyMitigationToNode(node.id, 'activate_backup');
            DigitalTwinService.applyMitigationToNode(node.id, 'enable_cooling');
        }
        if (node.cyberStatus !== 'secure') {
            DigitalTwinService.applyMitigationToNode(node.id, 'cyber_lockdown');
        }
    });
}
// ============================================================================
// Run Demo
// ============================================================================
function runDemo(demoId = 'investor-demo', stepCallback, completeCallback) {
    const sequence = AVAILABLE_DEMOS[demoId];
    if (!sequence) {
        return { success: false, message: `Demo '${demoId}' not found` };
    }
    if (demoState.isRunning) {
        return { success: false, message: 'Demo already running' };
    }
    // Reset state
    resetDemo();
    demoState.isRunning = true;
    demoState.startedAt = new Date().toISOString();
    demoState.sequence = sequence;
    onStepCallback = stepCallback || null;
    onCompleteCallback = completeCallback || null;
    index_js_1.logStore.addSimulationLog('demo', `Starting demo: ${sequence.name}`, {
        demoId,
        totalSteps: sequence.steps.length,
        totalDurationMs: sequence.totalDurationMs,
    });
    // Schedule all steps
    let cumulativeDelay = 0;
    sequence.steps.forEach((step, index) => {
        const timeout = setTimeout(() => {
            executeStep(step, index);
        }, cumulativeDelay);
        demoTimeouts.push(timeout);
        cumulativeDelay += step.durationMs;
    });
    // Schedule completion
    const completeTimeout = setTimeout(() => {
        demoState.isRunning = false;
        index_js_1.logStore.addSimulationLog('demo', `Demo completed: ${sequence.name}`, {
            demoId,
            duration: cumulativeDelay,
        });
        if (onCompleteCallback) {
            onCompleteCallback();
        }
    }, cumulativeDelay);
    demoTimeouts.push(completeTimeout);
    return { success: true, message: `Demo '${sequence.name}' started` };
}
// ============================================================================
// Reset Demo
// ============================================================================
function resetDemo() {
    // Clear all timeouts
    demoTimeouts.forEach(t => clearTimeout(t));
    demoTimeouts = [];
    // Reset state
    demoState = {
        isRunning: false,
        currentStepIndex: -1,
    };
    // Clear threats and recover system
    ThreatService.endAllThreats();
    MitigationService.clearRecommendations();
    // Reset digital twin
    DigitalTwinService.resetDigitalTwin();
    DigitalTwinService.initializeDigitalTwin(150, 12345);
    index_js_1.logStore.addSimulationLog('demo', 'Demo reset complete', {});
}
// ============================================================================
// Queries
// ============================================================================
function getDemoState() {
    return { ...demoState };
}
function getAvailableDemos() {
    return Object.values(AVAILABLE_DEMOS);
}
function isDemoRunning() {
    return demoState.isRunning;
}
function getCurrentStep() {
    if (!demoState.sequence || demoState.currentStepIndex < 0)
        return null;
    return demoState.sequence.steps[demoState.currentStepIndex] || null;
}
function skipToStep(stepIndex) {
    if (!demoState.isRunning || !demoState.sequence)
        return false;
    if (stepIndex < 0 || stepIndex >= demoState.sequence.steps.length)
        return false;
    const step = demoState.sequence.steps[stepIndex];
    executeStep(step, stepIndex);
    return true;
}
//# sourceMappingURL=DemoService.js.map