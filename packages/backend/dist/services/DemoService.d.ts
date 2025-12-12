/**
 * Demo Controller Service
 * Powers scripted 2-3 minute investor demonstrations
 */
import type { DemoStep, DemoSequence, DemoState } from '../types/index.js';
export declare function runDemo(demoId?: string, stepCallback?: (step: DemoStep, index: number) => void, completeCallback?: () => void): {
    success: boolean;
    message: string;
};
export declare function resetDemo(): void;
export declare function getDemoState(): DemoState;
export declare function getAvailableDemos(): DemoSequence[];
export declare function isDemoRunning(): boolean;
export declare function getCurrentStep(): DemoStep | null;
export declare function skipToStep(stepIndex: number): boolean;
