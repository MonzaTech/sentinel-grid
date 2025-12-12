/**
 * Digital Twin Service
 * Manages synthetic infrastructure nodes with realistic metrics
 */
import type { DigitalTwinNode, DependencyEdge, NodeCategory } from '../types/index.js';
export declare function initializeDigitalTwin(nodeCount?: number, seed?: number): void;
export declare function updateDigitalTwinTick(): void;
export declare function applyThreatToNodes(nodeIds: string[], threatType: string, severity: number): void;
export declare function applyMitigationToNode(nodeId: string, actionType: string): boolean;
export declare function getAllNodes(): DigitalTwinNode[];
export declare function getNodeById(id: string): DigitalTwinNode | undefined;
export declare function getNodesByRegion(region: string): DigitalTwinNode[];
export declare function getNodesByCategory(category: NodeCategory): DigitalTwinNode[];
export declare function getCriticalNodes(): DigitalTwinNode[];
export declare function getCompromisedNodes(): DigitalTwinNode[];
export declare function getAllEdges(): DependencyEdge[];
export declare function getNeighbors(nodeId: string): DigitalTwinNode[];
export declare function getDependencies(nodeId: string): DigitalTwinNode[];
export declare function getDependents(nodeId: string): DigitalTwinNode[];
export declare function isInitializedTwin(): boolean;
export declare function resetDigitalTwin(): void;
