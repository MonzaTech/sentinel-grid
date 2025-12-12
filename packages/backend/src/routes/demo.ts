/**
 * Sentinel Grid - Demo Routes
 * Scripted demo sequences for investor presentations
 */

import { Router, Request, Response } from 'express';
import { DemoService } from '../services/index.js';
import { validateRequest, RunDemoSchema, SkipToStepSchema, createApiResponse } from '../validation/index.js';
import { logStore } from '../stores/index.js';

const router = Router();

// Store for WebSocket broadcast function
let broadcastFn: ((channel: string, data: unknown) => void) | null = null;

export function setDemoBroadcast(fn: (channel: string, data: unknown) => void): void {
  broadcastFn = fn;
}

/**
 * GET /api/demo/available
 * List available demo sequences
 */
router.get('/available', (_req: Request, res: Response) => {
  try {
    const demos = DemoService.getAvailableDemos();
    res.json(createApiResponse(true, demos.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      totalDurationMs: d.totalDurationMs,
      stepCount: d.steps.length,
    }))));
  } catch (error) {
    console.error('Error getting available demos:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to get available demos'));
  }
});

/**
 * GET /api/demo/state
 * Get current demo state
 */
router.get('/state', (_req: Request, res: Response) => {
  try {
    const state = DemoService.getDemoState();
    const currentStep = DemoService.getCurrentStep();
    
    res.json(createApiResponse(true, {
      ...state,
      currentStep,
    }));
  } catch (error) {
    console.error('Error getting demo state:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to get demo state'));
  }
});

/**
 * POST /api/demo/run
 * Start a demo sequence
 */
router.post('/run', (req: Request, res: Response) => {
  try {
    const validation = validateRequest(RunDemoSchema, req.body);
    if (!validation.success) {
      res.status(400).json(createApiResponse(false, null, validation.errors.join(', ')));
      return;
    }

    const { demoId } = validation.data;

    const result = DemoService.runDemo(
      demoId,
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
        logStore.addSimulationLog('demo', `Step ${index + 1}: ${step.name}`, {
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
      }
    );

    if (result.success) {
      res.json(createApiResponse(true, { 
        started: true, 
        demoId,
        message: result.message 
      }));
    } else {
      res.status(400).json(createApiResponse(false, null, result.message));
    }
  } catch (error) {
    console.error('Error starting demo:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to start demo'));
  }
});

/**
 * POST /api/demo/reset
 * Reset and stop any running demo
 */
router.post('/reset', (_req: Request, res: Response) => {
  try {
    DemoService.resetDemo();

    if (broadcastFn) {
      broadcastFn('demo', {
        event: 'reset',
        message: 'Demo reset complete',
      });
    }

    logStore.addSimulationLog('demo', 'Demo reset', {});

    res.json(createApiResponse(true, { reset: true }, 'Demo reset successfully'));
  } catch (error) {
    console.error('Error resetting demo:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to reset demo'));
  }
});

/**
 * POST /api/demo/skip
 * Skip to a specific step in the demo
 */
router.post('/skip', (req: Request, res: Response) => {
  try {
    const validation = validateRequest(SkipToStepSchema, req.body);
    if (!validation.success) {
      res.status(400).json(createApiResponse(false, null, validation.errors.join(', ')));
      return;
    }

    const { stepIndex } = validation.data;
    const success = DemoService.skipToStep(stepIndex);

    if (success) {
      res.json(createApiResponse(true, { skippedTo: stepIndex }));
    } else {
      res.status(400).json(createApiResponse(false, null, 'Could not skip to step'));
    }
  } catch (error) {
    console.error('Error skipping demo step:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to skip demo step'));
  }
});

/**
 * GET /api/demo/:demoId
 * Get details of a specific demo
 */
router.get('/:demoId', (req: Request, res: Response) => {
  try {
    const demos = DemoService.getAvailableDemos();
    const demo = demos.find(d => d.id === req.params.demoId);

    if (!demo) {
      res.status(404).json(createApiResponse(false, null, 'Demo not found'));
      return;
    }

    res.json(createApiResponse(true, demo));
  } catch (error) {
    console.error('Error getting demo details:', error);
    res.status(500).json(createApiResponse(false, null, 'Failed to get demo details'));
  }
});

export default router;
