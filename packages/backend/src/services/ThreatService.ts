/**
 * Threat Simulation Service
 * Handles cyber attacks, sensor spoofing, overloads, and telecom outages
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ThreatSimulation,
  ThreatType,
  ThreatSubtype,
  ThreatRequest,
  SeverityLevel,
} from '../types/index.js';
import * as DigitalTwinService from './DigitalTwinService.js';
import { logStore, incidentStore } from '../stores/index.js';

// ============================================================================
// Threat Store
// ============================================================================

const activeThreats: Map<string, ThreatSimulation> = new Map();

// ============================================================================
// Threat Creation
// ============================================================================

export function createThreat(request: ThreatRequest): ThreatSimulation {
  const id = `threat_${uuidv4().slice(0, 8)}`;
  const now = new Date();
  const durationMs = (request.durationSeconds || 120) * 1000;

  // Determine affected nodes
  let affectedNodes: string[] = [];
  
  if (request.target) {
    // Target specific node and propagate
    affectedNodes = [request.target];
    const neighbors = DigitalTwinService.getNeighbors(request.target);
    const propagationCount = Math.floor(neighbors.length * (request.severity || 0.5));
    affectedNodes.push(...neighbors.slice(0, propagationCount).map(n => n.id));
  } else if (request.region) {
    // Target all nodes in region
    const regionNodes = DigitalTwinService.getNodesByRegion(request.region);
    const affectedCount = Math.floor(regionNodes.length * (request.severity || 0.5));
    affectedNodes = regionNodes.slice(0, affectedCount).map(n => n.id);
  } else {
    // Random selection across all nodes
    const allNodes = DigitalTwinService.getAllNodes();
    const affectedCount = Math.floor(allNodes.length * (request.severity || 0.3) * 0.2);
    affectedNodes = allNodes
      .sort(() => Math.random() - 0.5)
      .slice(0, affectedCount)
      .map(n => n.id);
  }

  const threat: ThreatSimulation = {
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
  logStore.addSimulationLog('threat', `Threat deployed: ${request.type}`, {
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
    const severityLevel: SeverityLevel = threat.severity >= 0.8 ? 'high' : 
      threat.severity >= 0.5 ? 'medium' : 'low';

    incidentStore.create({
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

function applyThreatImpact(threat: ThreatSimulation): void {
  DigitalTwinService.applyThreatToNodes(
    threat.affectedNodes, 
    threat.type, 
    threat.severity
  );
}

function calculatePropagationRate(type: ThreatType, severity: number): number {
  const baseRates: Record<ThreatType, number> = {
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

export function propagateThreats(): void {
  const now = new Date();

  activeThreats.forEach((threat, id) => {
    // Check if threat has expired
    if (new Date(threat.endsAt) <= now) {
      endThreat(id);
      return;
    }

    // Propagate to neighbors with probability
    const newlyAffected: string[] = [];
    
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
      
      logStore.addSimulationLog('threat', `Threat ${threat.type} propagated`, {
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

export function endThreat(threatId: string): boolean {
  const threat = activeThreats.get(threatId);
  if (!threat) return false;

  threat.active = false;
  activeThreats.delete(threatId);

  logStore.addSimulationLog('threat', `Threat ended: ${threat.type}`, {
    threatId,
    duration: Date.now() - new Date(threat.startedAt).getTime(),
    totalAffected: threat.affectedNodes.length,
  });

  return true;
}

export function endAllThreats(): number {
  const count = activeThreats.size;
  activeThreats.forEach((_, id) => endThreat(id));
  return count;
}

// ============================================================================
// Threat Queries
// ============================================================================

export function getActiveThreat(threatId: string): ThreatSimulation | undefined {
  return activeThreats.get(threatId);
}

export function getAllActiveThreats(): ThreatSimulation[] {
  return Array.from(activeThreats.values());
}

export function getThreatsByType(type: ThreatType): ThreatSimulation[] {
  return Array.from(activeThreats.values()).filter(t => t.type === type);
}

export function getThreatsAffectingNode(nodeId: string): ThreatSimulation[] {
  return Array.from(activeThreats.values()).filter(t => t.affectedNodes.includes(nodeId));
}

export function isNodeUnderThreat(nodeId: string): boolean {
  return Array.from(activeThreats.values()).some(t => t.affectedNodes.includes(nodeId));
}

// ============================================================================
// Cyber Attack Subtypes
// ============================================================================

export function createCyberAttack(
  target: string | null,
  subtype: ThreatSubtype,
  severity: number = 0.7
): ThreatSimulation {
  const attackDescriptions: Record<ThreatSubtype, string> = {
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

  logStore.addSimulationLog('threat', attackDescriptions[subtype] || 'Cyber attack initiated', {
    threatId: threat.id,
    subtype,
    severity,
  });

  return threat;
}

// ============================================================================
// Sensor Spoofing
// ============================================================================

export function createSensorSpoof(
  target: string,
  spoofType: 'load' | 'temperature' | 'voltage' | 'frequency',
  severity: number = 0.5
): ThreatSimulation {
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

  logStore.addSimulationLog('threat', `Sensor spoofing: ${spoofType} values falsified`, {
    threatId: threat.id,
    target,
    spoofType,
  });

  return threat;
}

// ============================================================================
// Physical Overload
// ============================================================================

export function createOverload(
  targets: string[],
  severity: number = 0.7
): ThreatSimulation {
  const threat = createThreat({
    type: 'overload',
    severity,
    durationSeconds: 90,
  });

  // Override affected nodes
  threat.affectedNodes = targets;
  DigitalTwinService.applyThreatToNodes(targets, 'overload', severity);

  logStore.addSimulationLog('threat', 'Overload condition created', {
    threatId: threat.id,
    affectedNodes: targets.length,
    severity,
  });

  return threat;
}

// ============================================================================
// Telecom Outage
// ============================================================================

export function createTelecomOutage(
  region?: string,
  severity: number = 0.6
): ThreatSimulation {
  let targets: string[];

  if (region) {
    targets = DigitalTwinService.getNodesByRegion(region)
      .filter(n => n.category === 'telecom' || n.category === 'control')
      .map(n => n.id);
  } else {
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

  logStore.addSimulationLog('threat', 'Telecom outage simulated', {
    threatId: threat.id,
    region: region || 'all',
    affectedNodes: targets.length,
  });

  return threat;
}

// ============================================================================
// Summary Generators
// ============================================================================

function generateThreatSummary(threat: ThreatSimulation): string {
  const typeDescriptions: Record<ThreatType, string> = {
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

function generateRootCause(threat: ThreatSimulation): string {
  const subtypeDescriptions: Record<ThreatSubtype, string> = {
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

  const typeRootCauses: Record<ThreatType, string> = {
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
