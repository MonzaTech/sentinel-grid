"use strict";
/**
 * Digital Twin Service
 * Manages synthetic infrastructure nodes with realistic metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDigitalTwin = initializeDigitalTwin;
exports.updateDigitalTwinTick = updateDigitalTwinTick;
exports.applyThreatToNodes = applyThreatToNodes;
exports.applyMitigationToNode = applyMitigationToNode;
exports.getAllNodes = getAllNodes;
exports.getNodeById = getNodeById;
exports.getNodesByRegion = getNodesByRegion;
exports.getNodesByCategory = getNodesByCategory;
exports.getCriticalNodes = getCriticalNodes;
exports.getCompromisedNodes = getCompromisedNodes;
exports.getAllEdges = getAllEdges;
exports.getNeighbors = getNeighbors;
exports.getDependencies = getDependencies;
exports.getDependents = getDependents;
exports.isInitializedTwin = isInitializedTwin;
exports.resetDigitalTwin = resetDigitalTwin;
// ============================================================================
// Constants
// ============================================================================
const NODE_TYPE_CONFIG = {
    substation: { category: 'transmission', ratedCapacity: 500, thermalLimit: 85 },
    transformer: { category: 'distribution', ratedCapacity: 100, thermalLimit: 95 },
    generator: { category: 'generation', ratedCapacity: 1000, thermalLimit: 90 },
    datacenter: { category: 'datacenter', ratedCapacity: 50, thermalLimit: 75 },
    telecom_tower: { category: 'telecom', ratedCapacity: 10, thermalLimit: 70 },
    water_pump: { category: 'distribution', ratedCapacity: 20, thermalLimit: 80 },
    control_center: { category: 'control', ratedCapacity: 5, thermalLimit: 65 },
    solar_farm: { category: 'generation', ratedCapacity: 200, thermalLimit: 85 },
    wind_turbine: { category: 'generation', ratedCapacity: 150, thermalLimit: 80 },
    battery_storage: { category: 'storage', ratedCapacity: 100, thermalLimit: 60 },
    scada_server: { category: 'control', ratedCapacity: 2, thermalLimit: 55 },
    relay_switch: { category: 'transmission', ratedCapacity: 50, thermalLimit: 90 },
};
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const NODE_TYPE_WEIGHTS = [
    ['substation', 20],
    ['transformer', 25],
    ['generator', 10],
    ['datacenter', 8],
    ['telecom_tower', 10],
    ['water_pump', 5],
    ['control_center', 3],
    ['solar_farm', 6],
    ['wind_turbine', 5],
    ['battery_storage', 4],
    ['scada_server', 2],
    ['relay_switch', 2],
];
// ============================================================================
// Service State
// ============================================================================
let nodes = new Map();
let edges = new Map();
let isInitialized = false;
// ============================================================================
// Seeded Random Helpers
// ============================================================================
function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };
}
function gaussianRandom(rng, mean, stdDev) {
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}
function weightedPick(rng, items) {
    const totalWeight = items.reduce((sum, [, w]) => sum + w, 0);
    let random = rng() * totalWeight;
    for (const [item, weight] of items) {
        random -= weight;
        if (random <= 0)
            return item;
    }
    return items[items.length - 1][0];
}
// ============================================================================
// Initialization
// ============================================================================
function initializeDigitalTwin(nodeCount = 150, seed = 12345) {
    const rng = seededRandom(seed);
    nodes.clear();
    edges.clear();
    // Region centers for clustering
    const regionCenters = {};
    REGIONS.forEach((region, i) => {
        const angle = (i / REGIONS.length) * 2 * Math.PI;
        regionCenters[region] = {
            x: 50 + 35 * Math.cos(angle),
            y: 50 + 35 * Math.sin(angle),
        };
    });
    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
        const id = `node_${i.toString().padStart(4, '0')}`;
        const region = REGIONS[Math.floor(rng() * REGIONS.length)];
        const type = weightedPick(rng, NODE_TYPE_WEIGHTS);
        const config = NODE_TYPE_CONFIG[type];
        const center = regionCenters[region];
        const x = Math.max(0, Math.min(100, gaussianRandom(rng, center.x, 12)));
        const y = Math.max(0, Math.min(100, gaussianRandom(rng, center.y, 12)));
        const node = {
            id,
            name: `${region} ${type.replace(/_/g, ' ')} ${Math.floor(rng() * 900 + 100)}`,
            type,
            category: config.category,
            region,
            coordinates: { x, y },
            // Physical Metrics
            riskScore: rng() * 0.25 + 0.05,
            health: rng() * 0.15 + 0.85,
            loadRatio: rng() * 0.4 + 0.3,
            temperature: rng() * 20 + 35,
            powerDraw: rng() * config.ratedCapacity * 0.7,
            voltage: 230 + gaussianRandom(rng, 0, 5),
            frequency: 60 + gaussianRandom(rng, 0, 0.05),
            // Cyber Metrics
            cyberHealth: rng() * 0.1 + 0.9,
            packetLoss: rng() * 0.02,
            latency: rng() * 50 + 10,
            tamperSignal: rng() * 0.05,
            lastAuthTime: new Date(Date.now() - rng() * 3600000).toISOString(),
            failedAuthCount: Math.floor(rng() * 3),
            // Status
            status: 'online',
            cyberStatus: 'secure',
            lastSeen: new Date().toISOString(),
            // Topology (will be filled after all nodes created)
            connections: [],
            dependencies: [],
            dependents: [],
            // Capacity
            ratedCapacity: config.ratedCapacity,
            currentLoad: rng() * config.ratedCapacity * 0.6,
            thermalLimit: config.thermalLimit,
        };
        nodes.set(id, node);
    }
    // Create dependency graph
    const nodeIds = Array.from(nodes.keys());
    nodeIds.forEach((nodeId) => {
        const node = nodes.get(nodeId);
        const connectionCount = Math.floor(rng() * 4) + 2;
        // Prefer connections within same region
        const sameRegion = nodeIds.filter((id) => id !== nodeId && nodes.get(id).region === node.region);
        const otherRegion = nodeIds.filter((id) => id !== nodeId && nodes.get(id).region !== node.region);
        for (let i = 0; i < connectionCount; i++) {
            const pool = rng() < 0.7 && sameRegion.length > 0 ? sameRegion : otherRegion;
            if (pool.length === 0)
                continue;
            const targetId = pool[Math.floor(rng() * pool.length)];
            if (node.connections.includes(targetId))
                continue;
            node.connections.push(targetId);
            const targetNode = nodes.get(targetId);
            if (!targetNode.connections.includes(nodeId)) {
                targetNode.connections.push(nodeId);
            }
            // Create edge
            const edgeType = node.category === 'control' || targetNode.category === 'control'
                ? 'control'
                : node.category === 'telecom' || targetNode.category === 'telecom'
                    ? 'data'
                    : 'power';
            const edgeId = `${nodeId}-${targetId}`;
            if (!edges.has(edgeId) && !edges.has(`${targetId}-${nodeId}`)) {
                edges.set(edgeId, {
                    from: nodeId,
                    to: targetId,
                    type: edgeType,
                    weight: rng() * 0.5 + 0.5,
                    latency: rng() * 30 + 5,
                    bandwidth: rng() * 900 + 100,
                    isActive: true,
                });
            }
        }
        // Create dependencies (control nodes depend on other nodes)
        if (node.category === 'control' || node.category === 'datacenter') {
            const depCount = Math.floor(rng() * 3) + 1;
            const generators = nodeIds.filter((id) => nodes.get(id).category === 'generation');
            for (let i = 0; i < depCount && i < generators.length; i++) {
                const depId = generators[Math.floor(rng() * generators.length)];
                if (!node.dependencies.includes(depId)) {
                    node.dependencies.push(depId);
                    nodes.get(depId).dependents.push(nodeId);
                }
            }
        }
    });
    isInitialized = true;
}
// ============================================================================
// Tick Update - Live Metrics Simulation
// ============================================================================
function updateDigitalTwinTick() {
    if (!isInitialized)
        return;
    const now = new Date();
    const hourOfDay = now.getHours();
    const isBusinessHours = hourOfDay >= 8 && hourOfDay <= 18;
    const loadMultiplier = isBusinessHours ? 1.2 : 0.8;
    nodes.forEach((node, nodeId) => {
        const rng = Math.random;
        // Load fluctuation based on time of day
        let loadDelta = (rng() - 0.5) * 0.05 * loadMultiplier;
        if (node.category === 'generation') {
            // Renewable generation varies
            if (node.type === 'solar_farm') {
                loadDelta += (hourOfDay >= 6 && hourOfDay <= 18 ? 0.02 : -0.02);
            }
        }
        node.loadRatio = Math.max(0.1, Math.min(0.95, node.loadRatio + loadDelta));
        node.currentLoad = node.loadRatio * node.ratedCapacity;
        // Thermal stress
        const thermalDelta = (node.loadRatio - 0.5) * 2 + (rng() - 0.5) * 2;
        node.temperature = Math.max(25, Math.min(node.thermalLimit + 10, node.temperature + thermalDelta));
        // Voltage deviation
        const voltageDelta = (rng() - 0.5) * 0.5;
        node.voltage = Math.max(220, Math.min(240, node.voltage + voltageDelta));
        // Frequency deviation
        const freqDelta = (rng() - 0.5) * 0.01;
        node.frequency = Math.max(59.9, Math.min(60.1, node.frequency + freqDelta));
        // Cyber metrics
        const latencyDelta = (rng() - 0.5) * 5;
        node.latency = Math.max(5, Math.min(200, node.latency + latencyDelta));
        node.packetLoss = Math.max(0, Math.min(0.2, node.packetLoss + (rng() - 0.5) * 0.005));
        // Tamper signal (small random drift, spikes during attacks)
        node.tamperSignal = Math.max(0, Math.min(1, node.tamperSignal + (rng() - 0.52) * 0.02));
        // Risk score calculation
        const physicalRisk = (node.temperature / node.thermalLimit) * 0.3 +
            (node.loadRatio > 0.85 ? 0.3 : node.loadRatio * 0.2);
        const cyberRisk = node.packetLoss * 2 + node.tamperSignal * 0.5 +
            (node.latency > 100 ? 0.2 : 0);
        const neighborRisk = node.connections
            .map((id) => nodes.get(id)?.riskScore || 0)
            .reduce((a, b) => a + b, 0) / (node.connections.length || 1);
        node.riskScore = Math.max(0, Math.min(1, physicalRisk * 0.4 + cyberRisk * 0.3 + neighborRisk * 0.3 + (rng() - 0.5) * 0.05));
        // Health
        node.health = Math.max(0.1, Math.min(1, 1 - node.riskScore * 0.5 + (rng() - 0.5) * 0.02));
        // Cyber health
        node.cyberHealth = Math.max(0.1, Math.min(1, 1 - cyberRisk + (rng() - 0.5) * 0.02));
        // Update status
        if (node.riskScore > 0.8 || node.health < 0.3) {
            node.status = 'critical';
        }
        else if (node.riskScore > 0.6 || node.health < 0.5) {
            node.status = 'degraded';
        }
        else {
            node.status = 'online';
        }
        // Cyber status
        if (node.cyberHealth < 0.4 || node.tamperSignal > 0.7) {
            node.cyberStatus = 'compromised';
        }
        else if (node.cyberHealth < 0.7 || node.tamperSignal > 0.3) {
            node.cyberStatus = 'warning';
        }
        else {
            node.cyberStatus = 'secure';
        }
        node.lastSeen = now.toISOString();
    });
}
// ============================================================================
// Apply Threat Effects
// ============================================================================
function applyThreatToNodes(nodeIds, threatType, severity) {
    nodeIds.forEach((nodeId) => {
        const node = nodes.get(nodeId);
        if (!node)
            return;
        switch (threatType) {
            case 'cyber_attack':
                node.cyberHealth = Math.max(0.1, node.cyberHealth - severity * 0.4);
                node.tamperSignal = Math.min(1, node.tamperSignal + severity * 0.5);
                node.packetLoss = Math.min(0.5, node.packetLoss + severity * 0.1);
                node.riskScore = Math.min(1, node.riskScore + severity * 0.3);
                break;
            case 'sensor_spoofing':
                node.tamperSignal = Math.min(1, node.tamperSignal + severity * 0.7);
                node.riskScore = Math.min(1, node.riskScore + severity * 0.2);
                break;
            case 'overload':
                node.loadRatio = Math.min(1, node.loadRatio + severity * 0.3);
                node.temperature = Math.min(node.thermalLimit + 20, node.temperature + severity * 15);
                node.riskScore = Math.min(1, node.riskScore + severity * 0.4);
                break;
            case 'telecom_outage':
                node.latency = Math.min(1000, node.latency + severity * 500);
                node.packetLoss = Math.min(0.8, node.packetLoss + severity * 0.5);
                node.cyberHealth = Math.max(0.1, node.cyberHealth - severity * 0.3);
                break;
            case 'equipment_failure':
                node.health = Math.max(0.1, node.health - severity * 0.5);
                node.riskScore = Math.min(1, node.riskScore + severity * 0.5);
                break;
            case 'weather_stress':
                node.temperature = Math.min(node.thermalLimit + 15, node.temperature + severity * 10);
                node.riskScore = Math.min(1, node.riskScore + severity * 0.2);
                break;
        }
        // Update status after threat
        if (node.riskScore > 0.8)
            node.status = 'critical';
        else if (node.riskScore > 0.6)
            node.status = 'degraded';
        if (node.cyberHealth < 0.4)
            node.cyberStatus = 'compromised';
        else if (node.cyberHealth < 0.7)
            node.cyberStatus = 'warning';
    });
}
// ============================================================================
// Mitigation Effects
// ============================================================================
function applyMitigationToNode(nodeId, actionType) {
    const node = nodes.get(nodeId);
    if (!node)
        return false;
    switch (actionType) {
        case 'isolate':
            node.status = 'isolated';
            node.riskScore = Math.max(0, node.riskScore - 0.3);
            break;
        case 'load_shed':
            node.loadRatio = Math.max(0.2, node.loadRatio - 0.3);
            node.currentLoad = node.loadRatio * node.ratedCapacity;
            node.riskScore = Math.max(0, node.riskScore - 0.2);
            break;
        case 'enable_cooling':
            node.temperature = Math.max(30, node.temperature - 15);
            node.riskScore = Math.max(0, node.riskScore - 0.1);
            break;
        case 'cyber_lockdown':
            node.cyberStatus = 'isolated';
            node.cyberHealth = Math.min(1, node.cyberHealth + 0.2);
            node.tamperSignal = Math.max(0, node.tamperSignal - 0.3);
            break;
        case 'activate_backup':
            node.health = Math.min(1, node.health + 0.3);
            node.riskScore = Math.max(0, node.riskScore - 0.25);
            break;
        case 'dispatch_maintenance':
            node.health = Math.min(1, node.health + 0.1);
            break;
        case 'reroute':
            node.loadRatio = Math.max(0.3, node.loadRatio - 0.2);
            node.riskScore = Math.max(0, node.riskScore - 0.15);
            break;
    }
    // Recalculate status
    if (node.status !== 'isolated') {
        if (node.riskScore > 0.8)
            node.status = 'critical';
        else if (node.riskScore > 0.6)
            node.status = 'degraded';
        else
            node.status = 'online';
    }
    return true;
}
// ============================================================================
// Getters
// ============================================================================
function getAllNodes() {
    return Array.from(nodes.values());
}
function getNodeById(id) {
    return nodes.get(id);
}
function getNodesByRegion(region) {
    return Array.from(nodes.values()).filter((n) => n.region === region);
}
function getNodesByCategory(category) {
    return Array.from(nodes.values()).filter((n) => n.category === category);
}
function getCriticalNodes() {
    return Array.from(nodes.values()).filter((n) => n.status === 'critical');
}
function getCompromisedNodes() {
    return Array.from(nodes.values()).filter((n) => n.cyberStatus === 'compromised');
}
function getAllEdges() {
    return Array.from(edges.values());
}
function getNeighbors(nodeId) {
    const node = nodes.get(nodeId);
    if (!node)
        return [];
    return node.connections.map((id) => nodes.get(id)).filter(Boolean);
}
function getDependencies(nodeId) {
    const node = nodes.get(nodeId);
    if (!node)
        return [];
    return node.dependencies.map((id) => nodes.get(id)).filter(Boolean);
}
function getDependents(nodeId) {
    const node = nodes.get(nodeId);
    if (!node)
        return [];
    return node.dependents.map((id) => nodes.get(id)).filter(Boolean);
}
function isInitializedTwin() {
    return isInitialized;
}
function resetDigitalTwin() {
    nodes.clear();
    edges.clear();
    isInitialized = false;
}
// Initialize with default configuration
initializeDigitalTwin(150, 12345);
//# sourceMappingURL=DigitalTwinService.js.map