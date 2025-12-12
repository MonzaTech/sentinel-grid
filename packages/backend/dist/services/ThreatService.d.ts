/**
 * Threat Simulation Service
 * Handles cyber attacks, sensor spoofing, overloads, and telecom outages
 */
import type { ThreatSimulation, ThreatType, ThreatSubtype, ThreatRequest } from '../types/index.js';
export declare function createThreat(request: ThreatRequest): ThreatSimulation;
export declare function propagateThreats(): void;
export declare function endThreat(threatId: string): boolean;
export declare function endAllThreats(): number;
export declare function getActiveThreat(threatId: string): ThreatSimulation | undefined;
export declare function getAllActiveThreats(): ThreatSimulation[];
export declare function getThreatsByType(type: ThreatType): ThreatSimulation[];
export declare function getThreatsAffectingNode(nodeId: string): ThreatSimulation[];
export declare function isNodeUnderThreat(nodeId: string): boolean;
export declare function createCyberAttack(target: string | null, subtype: ThreatSubtype, severity?: number): ThreatSimulation;
export declare function createSensorSpoof(target: string, spoofType: 'load' | 'temperature' | 'voltage' | 'frequency', severity?: number): ThreatSimulation;
export declare function createOverload(targets: string[], severity?: number): ThreatSimulation;
export declare function createTelecomOutage(region?: string, severity?: number): ThreatSimulation;
