/**
 * Sentinel Grid - Simulation Engine
 * Deterministic infrastructure simulation with weather, threats, and cascades
 */
import { SeededRandom } from './SeededRandom';
import { Node, WeatherData, Threat, CascadeEvent, SystemState, SimulationConfig } from './types';
export declare const CRITICAL_THRESHOLD = 0.8;
export declare const WARNING_THRESHOLD = 0.6;
export declare function initializeNodes(config?: Partial<SimulationConfig>): Record<string, Node>;
export declare function fetchWeatherData(rng?: SeededRandom): WeatherData;
export declare function updateNodeState(nodes: Record<string, Node>, threat: Threat | null, weather: WeatherData, config?: Partial<SimulationConfig>): Record<string, Node>;
export declare function simulateCascade(nodes: Record<string, Node>, originId: string, severity?: number, config?: Partial<SimulationConfig>): {
    nodes: Record<string, Node>;
    event: CascadeEvent;
};
export interface MitigationResult {
    success: boolean;
    node: string;
    updatedNode: Node;
    actions: string[];
    riskReduction: number;
}
export declare function autoMitigate(nodes: Record<string, Node>, nodeId: string, config?: Partial<SimulationConfig>): MitigationResult;
export declare function getSystemState(nodes: Record<string, Node>): SystemState;
export declare function createAuditHash(data: Record<string, unknown>): string;
export declare function createSignedHash(data: Record<string, unknown>, hmacKey: string): {
    sha256: string;
    signature: string;
};
//# sourceMappingURL=SimulationEngine.d.ts.map