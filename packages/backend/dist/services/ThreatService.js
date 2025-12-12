"use strict";
/**
 * Threat Simulation Service
 * Handles cyber attacks, sensor spoofing, overloads, and telecom outages
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
exports.createThreat = createThreat;
exports.propagateThreats = propagateThreats;
exports.endThreat = endThreat;
exports.endAllThreats = endAllThreats;
exports.getActiveThreat = getActiveThreat;
exports.getAllActiveThreats = getAllActiveThreats;
exports.getThreatsByType = getThreatsByType;
exports.getThreatsAffectingNode = getThreatsAffectingNode;
exports.isNodeUnderThreat = isNodeUnderThreat;
exports.createCyberAttack = createCyberAttack;
exports.createSensorSpoof = createSensorSpoof;
exports.createOverload = createOverload;
exports.createTelecomOutage = createTelecomOutage;
const uuid_1 = require("uuid");
const DigitalTwinService = __importStar(require("./DigitalTwinService.js"));
const index_js_1 = require("../stores/index.js");
// ============================================================================
// Threat Store
// ============================================================================
const activeThreats = new Map();
// ============================================================================
// Threat Creation
// ============================================================================
function createThreat(request) {
    const id = `threat_${(0, uuid_1.v4)().slice(0, 8)}`;
    const now = new Date();
    const durationMs = (request.durationSeconds || 120) * 1000;
    // Determine affected nodes
    let affectedNodes = [];
    if (request.target) {
        // Target specific node and propagate
        affectedNodes = [request.target];
        const neighbors = DigitalTwinService.getNeighbors(request.target);
        const propagationCount = Math.floor(neighbors.length * (request.severity || 0.5));
        affectedNodes.push(...neighbors.slice(0, propagationCount).map(n => n.id));
    }
    else if (request.region) {
        // Target all nodes in region
        const regionNodes = DigitalTwinService.getNodesByRegion(request.region);
        const affectedCount = Math.floor(regionNodes.length * (request.severity || 0.5));
        affectedNodes = regionNodes.slice(0, affectedCount).map(n => n.id);
    }
    else {
        // Random selection across all nodes
        const allNodes = DigitalTwinService.getAllNodes();
        const affectedCount = Math.floor(allNodes.length * (request.severity || 0.3) * 0.2);
        affectedNodes = allNodes
            .sort(() => Math.random() - 0.5)
            .slice(0, affectedCount)
            .map(n => n.id);
    }
    const threat = {
        id,
        type: request.type,
        subtype: request.subtype,
        severity: request.severity || 0.6,
        target: request.target || null,
        region: request.region,
        active: true,
        startedAt: now.toISOString(),
        endsAt: new Date(now.getTime() + durationMs).toISOString(),
        propagationRate: calculatePropagationRate(request.type, request.severity || 0.6),
        affectedNodes,
        metadata: {
            createdBy: 'simulation',
            ...request,
        },
    };
    activeThreats.set(id, threat);
    // Apply initial impact
    applyThreatImpact(threat);
    // Log the threat
    index_js_1.logStore.addSimulationLog('threat', `Threat deployed: ${request.type}`, {
        threatId: id,
        type: request.type,
        subtype: request.subtype,
        severity: threat.severity,
        affectedNodes: affectedNodes.length,
        region: request.region,
        target: request.target,
    });
    // Create incident if severe enough
    if (threat.severity >= 0.6 && affectedNodes.length >= 3) {
        const severityLevel = threat.severity >= 0.8 ? 'high' :
            threat.severity >= 0.5 ? 'medium' : 'low';
        index_js_1.incidentStore.create({
            startedAt: now.toISOString(),
            severity: severityLevel,
            affectedNodes,
            summary: generateThreatSummary(threat),
            rootCause: generateRootCause(threat),
            mitigationActions: [],
            status: 'open',
            threatType: request.type,
            onChain: null,
        });
    }
    // Schedule threat end
    setTimeout(() => endThreat(id), durationMs);
    return threat;
}
// ============================================================================
// Threat Impact Application
// ============================================================================
function applyThreatImpact(threat) {
    DigitalTwinService.applyThreatToNodes(threat.affectedNodes, threat.type, threat.severity);
}
function calculatePropagationRate(type, severity) {
    const baseRates = {
        cyber_attack: 0.4,
        physical_intrusion: 0.1,
        equipment_failure: 0.3,
        overload: 0.5,
        weather_stress: 0.6,
        cascade_origin: 0.7,
        sensor_spoofing: 0.2,
        telecom_outage: 0.4,
        supply_chain: 0.1,
    };
    return (baseRates[type] || 0.3) * severity;
}
// ============================================================================
// Threat Propagation (called each tick)
// ============================================================================
function propagateThreats() {
    const now = new Date();
    activeThreats.forEach((threat, id) => {
        // Check if threat has expired
        if (new Date(threat.endsAt) <= now) {
            endThreat(id);
            return;
        }
        // Propagate to neighbors with probability
        const newlyAffected = [];
        threat.affectedNodes.forEach(nodeId => {
            const neighbors = DigitalTwinService.getNeighbors(nodeId);
            neighbors.forEach(neighbor => {
                if (!threat.affectedNodes.includes(neighbor.id) &&
                    Math.random() < threat.propagationRate * 0.1) {
                    newlyAffected.push(neighbor.id);
                }
            });
        });
        if (newlyAffected.length > 0) {
            threat.affectedNodes.push(...newlyAffected);
            DigitalTwinService.applyThreatToNodes(newlyAffected, threat.type, threat.severity * 0.7);
            index_js_1.logStore.addSimulationLog('threat', `Threat ${threat.type} propagated`, {
                threatId: id,
                newlyAffected: newlyAffected.length,
                totalAffected: threat.affectedNodes.length,
            });
        }
    });
}
// ============================================================================
// End Threat
// ============================================================================
function endThreat(threatId) {
    const threat = activeThreats.get(threatId);
    if (!threat)
        return false;
    threat.active = false;
    activeThreats.delete(threatId);
    index_js_1.logStore.addSimulationLog('threat', `Threat ended: ${threat.type}`, {
        threatId,
        duration: Date.now() - new Date(threat.startedAt).getTime(),
        totalAffected: threat.affectedNodes.length,
    });
    return true;
}
function endAllThreats() {
    const count = activeThreats.size;
    activeThreats.forEach((_, id) => endThreat(id));
    return count;
}
// ============================================================================
// Threat Queries
// ============================================================================
function getActiveThreat(threatId) {
    return activeThreats.get(threatId);
}
function getAllActiveThreats() {
    return Array.from(activeThreats.values());
}
function getThreatsByType(type) {
    return Array.from(activeThreats.values()).filter(t => t.type === type);
}
function getThreatsAffectingNode(nodeId) {
    return Array.from(activeThreats.values()).filter(t => t.affectedNodes.includes(nodeId));
}
function isNodeUnderThreat(nodeId) {
    return Array.from(activeThreats.values()).some(t => t.affectedNodes.includes(nodeId));
}
// ============================================================================
// Cyber Attack Subtypes
// ============================================================================
function createCyberAttack(target, subtype, severity = 0.7) {
    const attackDescriptions = {
        ransomware: 'Ransomware infection targeting control systems',
        dos_attack: 'Distributed denial of service attack on network infrastructure',
        command_injection: 'Malicious commands injected into SCADA systems',
        credential_theft: 'Credential compromise allowing unauthorized access',
        man_in_middle: 'Network interception modifying control signals',
        false_data_injection: 'Falsified sensor data injected into monitoring systems',
        gps_spoofing: 'GPS timing signals spoofed affecting synchronization',
        firmware_attack: 'Malicious firmware uploaded to embedded devices',
        voltage_manipulation: 'Voltage setpoints manipulated remotely',
        frequency_deviation: 'Frequency regulation systems compromised',
    };
    const threat = createThreat({
        type: 'cyber_attack',
        subtype,
        target: target || undefined,
        severity,
        durationSeconds: 180,
    });
    index_js_1.logStore.addSimulationLog('threat', attackDescriptions[subtype] || 'Cyber attack initiated', {
        threatId: threat.id,
        subtype,
        severity,
    });
    return threat;
}
// ============================================================================
// Sensor Spoofing
// ============================================================================
function createSensorSpoof(target, spoofType, severity = 0.5) {
    const threat = createThreat({
        type: 'sensor_spoofing',
        target,
        severity,
        durationSeconds: 120,
    });
    // Apply specific spoofing effects
    const node = DigitalTwinService.getNodeById(target);
    if (node) {
        switch (spoofType) {
            case 'load':
                // Make load appear normal when it's not
                node.tamperSignal = Math.min(1, node.tamperSignal + 0.5);
                break;
            case 'temperature':
                node.tamperSignal = Math.min(1, node.tamperSignal + 0.4);
                break;
            case 'voltage':
            case 'frequency':
                node.tamperSignal = Math.min(1, node.tamperSignal + 0.6);
                break;
        }
    }
    index_js_1.logStore.addSimulationLog('threat', `Sensor spoofing: ${spoofType} values falsified`, {
        threatId: threat.id,
        target,
        spoofType,
    });
    return threat;
}
// ============================================================================
// Physical Overload
// ============================================================================
function createOverload(targets, severity = 0.7) {
    const threat = createThreat({
        type: 'overload',
        severity,
        durationSeconds: 90,
    });
    // Override affected nodes
    threat.affectedNodes = targets;
    DigitalTwinService.applyThreatToNodes(targets, 'overload', severity);
    index_js_1.logStore.addSimulationLog('threat', 'Overload condition created', {
        threatId: threat.id,
        affectedNodes: targets.length,
        severity,
    });
    return threat;
}
// ============================================================================
// Telecom Outage
// ============================================================================
function createTelecomOutage(region, severity = 0.6) {
    let targets;
    if (region) {
        targets = DigitalTwinService.getNodesByRegion(region)
            .filter(n => n.category === 'telecom' || n.category === 'control')
            .map(n => n.id);
    }
    else {
        targets = DigitalTwinService.getNodesByCategory('telecom').map(n => n.id);
    }
    const threat = createThreat({
        type: 'telecom_outage',
        region,
        severity,
        durationSeconds: 150,
    });
    threat.affectedNodes = targets;
    DigitalTwinService.applyThreatToNodes(targets, 'telecom_outage', severity);
    index_js_1.logStore.addSimulationLog('threat', 'Telecom outage simulated', {
        threatId: threat.id,
        region: region || 'all',
        affectedNodes: targets.length,
    });
    return threat;
}
// ============================================================================
// Summary Generators
// ============================================================================
function generateThreatSummary(threat) {
    const typeDescriptions = {
        cyber_attack: `Cyber attack affecting ${threat.affectedNodes.length} nodes`,
        physical_intrusion: 'Unauthorized physical access detected',
        equipment_failure: `Equipment failure at ${threat.affectedNodes.length} locations`,
        overload: `System overload affecting ${threat.affectedNodes.length} nodes`,
        weather_stress: `Weather-induced stress on ${threat.affectedNodes.length} nodes`,
        cascade_origin: 'Cascade failure initiated',
        sensor_spoofing: 'Sensor data integrity compromised',
        telecom_outage: `Communication loss affecting ${threat.affectedNodes.length} nodes`,
        supply_chain: 'Supply chain disruption detected',
    };
    return typeDescriptions[threat.type] || `Threat incident: ${threat.type}`;
}
function generateRootCause(threat) {
    const subtypeDescriptions = {
        ransomware: 'Ransomware infection through phishing vector',
        dos_attack: 'Coordinated DDoS attack from multiple sources',
        command_injection: 'SCADA command injection via compromised HMI',
        credential_theft: 'Credential compromise through social engineering',
        man_in_middle: 'Network traffic interception at switch level',
        false_data_injection: 'Falsified sensor data from compromised RTU',
        gps_spoofing: 'GPS synchronization attack affecting PMUs',
        firmware_attack: 'Malicious firmware update pushed to devices',
        voltage_manipulation: 'Voltage setpoint manipulation via SCADA',
        frequency_deviation: 'Frequency regulation compromise',
    };
    if (threat.subtype && subtypeDescriptions[threat.subtype]) {
        return subtypeDescriptions[threat.subtype];
    }
    const typeRootCauses = {
        cyber_attack: 'Coordinated cyber intrusion targeting control systems',
        physical_intrusion: 'Unauthorized access to secured facility',
        equipment_failure: 'Component degradation exceeding rated limits',
        overload: 'Demand exceeding generation and transfer capacity',
        weather_stress: 'Extreme weather conditions exceeding design parameters',
        cascade_origin: 'Initial failure triggering cascading effects',
        sensor_spoofing: 'Compromised sensor data integrity',
        telecom_outage: 'Communication infrastructure failure',
        supply_chain: 'Critical component supply disruption',
    };
    return typeRootCauses[threat.type] || 'Unknown threat vector';
}
//# sourceMappingURL=ThreatService.js.map