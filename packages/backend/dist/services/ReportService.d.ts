/**
 * Report Service
 * Generates incident reports, accuracy reports, and operator log summaries
 */
import type { IncidentReport, AccuracyReport, OperatorLogReport } from '../types/index.js';
export declare function trackPrediction(prediction: {
    id: string;
    type: string;
    nodeId: string;
    probability: number;
    severity: string;
    predictedTime: string;
}): void;
export declare function resolvePrediction(predictionId: string, wasAccurate: boolean, actualOutcome?: string): void;
export declare function generateIncidentReport(startDate?: string, endDate?: string): IncidentReport;
export declare function generateAccuracyReport(startDate?: string, endDate?: string): AccuracyReport;
export declare function generateOperatorLogReport(startDate?: string, endDate?: string): OperatorLogReport;
export declare function clearPredictionTracking(): void;
export declare function getTrackedPredictionCount(): number;
export declare function getResolvedPredictionCount(): number;
export declare function seedDemoReportData(): void;
