/**
 * Mitigation Advisor Service
 * Computes recommended actions for predictions and incidents
 */
import type { MitigationRecommendation, MitigationActionType, EnhancedPrediction, Incident } from '../types/index.js';
export declare function generateRecommendationsForPrediction(prediction: EnhancedPrediction): MitigationRecommendation[];
export declare function generateRecommendationsForIncident(incident: Incident): MitigationRecommendation[];
export declare function executeMitigation(nodeId: string, actionType: MitigationActionType, operator?: string): {
    success: boolean;
    riskReduction: number;
    message: string;
};
export declare function executeBatchMitigation(nodeIds: string[], actionType: MitigationActionType, operator?: string): {
    success: number;
    failed: number;
    totalRiskReduction: number;
};
export declare function autoMitigateCriticalNodes(): {
    mitigated: number;
    actions: Array<{
        nodeId: string;
        action: string;
    }>;
};
export declare function getAllRecommendations(): MitigationRecommendation[];
export declare function getPendingRecommendations(): MitigationRecommendation[];
export declare function getRecommendationsForNode(nodeId: string): MitigationRecommendation[];
export declare function getRecommendationsForPrediction(predictionId: string): MitigationRecommendation[];
export declare function getRecommendationsForIncident(incidentId: string): MitigationRecommendation[];
export declare function approveRecommendation(recommendationId: string): boolean;
export declare function clearRecommendations(): void;
