"use strict";
/**
 * Sentinel Grid - Demo Routes
 * Scripted demo sequences for investor presentations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDemoBroadcast = setDemoBroadcast;
const express_1 = require("express");
const index_js_1 = require("../services/index.js");
const index_js_2 = require("../validation/index.js");
const index_js_3 = require("../stores/index.js");
const router = (0, express_1.Router)();
// Store for WebSocket broadcast function
let broadcastFn = null;
function setDemoBroadcast(fn) {
    broadcastFn = fn;
}
/**
 * GET /api/demo/available
 * List available demo sequences
 */
router.get('/available', (_req, res) => {
    try {
        const demos = index_js_1.DemoService.getAvailableDemos();
        res.json((0, index_js_2.createApiResponse)(true, demos.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            totalDurationMs: d.totalDurationMs,
            stepCount: d.steps.length,
        }))));
    }
    catch (error) {
        console.error('Error getting available demos:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to get available demos'));
    }
});
/**
 * GET /api/demo/state
 * Get current demo state
 */
router.get('/state', (_req, res) => {
    try {
        const state = index_js_1.DemoService.getDemoState();
        const currentStep = index_js_1.DemoService.getCurrentStep();
        res.json((0, index_js_2.createApiResponse)(true, {
            ...state,
            currentStep,
        }));
    }
    catch (error) {
        console.error('Error getting demo state:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to get demo state'));
    }
});
/**
 * POST /api/demo/run
 * Start a demo sequence
 */
router.post('/run', (req, res) => {
    try {
        const validation = (0, index_js_2.validateRequest)(index_js_2.RunDemoSchema, req.body);
        if (!validation.success) {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, validation.errors.join(', ')));
            return;
        }
        const { demoId } = validation.data;
        const result = index_js_1.DemoService.runDemo(demoId, 
        // Step callback - broadcast to WebSocket
        (step, index) => {
            if (broadcastFn) {
                broadcastFn('demo', {
                    event: 'step',
                    stepIndex: index,
                    step: {
                        id: step.id,
                        name: step.name,
                        description: step.description,
                        expectedOutcome: step.expectedOutcome,
                    },
                });
            }
            index_js_3.logStore.addSimulationLog('demo', `Step ${index + 1}: ${step.name}`, {
                stepId: step.id,
                description: step.description,
            });
        }, 
        // Complete callback
        () => {
            if (broadcastFn) {
                broadcastFn('demo', {
                    event: 'complete',
                    message: 'Demo sequence completed',
                });
            }
        });
        if (result.success) {
            res.json((0, index_js_2.createApiResponse)(true, {
                started: true,
                demoId,
                message: result.message
            }));
        }
        else {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, result.message));
        }
    }
    catch (error) {
        console.error('Error starting demo:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to start demo'));
    }
});
/**
 * POST /api/demo/reset
 * Reset and stop any running demo
 */
router.post('/reset', (_req, res) => {
    try {
        index_js_1.DemoService.resetDemo();
        if (broadcastFn) {
            broadcastFn('demo', {
                event: 'reset',
                message: 'Demo reset complete',
            });
        }
        index_js_3.logStore.addSimulationLog('demo', 'Demo reset', {});
        res.json((0, index_js_2.createApiResponse)(true, { reset: true }, 'Demo reset successfully'));
    }
    catch (error) {
        console.error('Error resetting demo:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to reset demo'));
    }
});
/**
 * POST /api/demo/skip
 * Skip to a specific step in the demo
 */
router.post('/skip', (req, res) => {
    try {
        const validation = (0, index_js_2.validateRequest)(index_js_2.SkipToStepSchema, req.body);
        if (!validation.success) {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, validation.errors.join(', ')));
            return;
        }
        const { stepIndex } = validation.data;
        const success = index_js_1.DemoService.skipToStep(stepIndex);
        if (success) {
            res.json((0, index_js_2.createApiResponse)(true, { skippedTo: stepIndex }));
        }
        else {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, 'Could not skip to step'));
        }
    }
    catch (error) {
        console.error('Error skipping demo step:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to skip demo step'));
    }
});
/**
 * GET /api/demo/:demoId
 * Get details of a specific demo
 */
router.get('/:demoId', (req, res) => {
    try {
        const demos = index_js_1.DemoService.getAvailableDemos();
        const demo = demos.find(d => d.id === req.params.demoId);
        if (!demo) {
            res.status(404).json((0, index_js_2.createApiResponse)(false, null, 'Demo not found'));
            return;
        }
        res.json((0, index_js_2.createApiResponse)(true, demo));
    }
    catch (error) {
        console.error('Error getting demo details:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to get demo details'));
    }
});
exports.default = router;
//# sourceMappingURL=demo.js.map