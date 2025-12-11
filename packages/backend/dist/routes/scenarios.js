"use strict";
/**
 * Sentinel Grid Backend - Scenarios Routes
 * GET /api/scenarios/templates, POST /api/scenarios/run
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const simulation_js_1 = require("../services/simulation.js");
const index_js_1 = require("../stores/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const router = (0, express_1.Router)();
// Validation schemas
const runScenarioSchema = zod_1.z.object({
    templateId: zod_1.z.string().min(1),
    severity: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    horizonHours: zod_1.z.number().min(0.5).max(48).optional(),
});
/**
 * GET /api/scenarios/templates
 * List all scenario templates
 */
router.get('/templates', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const templates = index_js_1.scenarioStore.getAll();
    res.json({
        success: true,
        count: templates.length,
        data: templates,
    });
}));
/**
 * GET /api/scenarios/templates/:id
 * Get a specific scenario template
 */
router.get('/templates/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const template = index_js_1.scenarioStore.getById(id);
    if (!template) {
        throw (0, errorHandler_js_1.createError)(404, `Scenario template ${id} not found`);
    }
    res.json({
        success: true,
        data: template,
    });
}));
/**
 * POST /api/scenarios/run
 * Run a scenario from a template
 */
router.post('/run', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { templateId, severity, horizonHours } = runScenarioSchema.parse(req.body);
    const template = index_js_1.scenarioStore.getById(templateId);
    if (!template) {
        throw (0, errorHandler_js_1.createError)(404, `Scenario template ${templateId} not found`);
    }
    const sim = (0, simulation_js_1.getSimulation)();
    // Start simulation if not running
    if (!sim.isSimulationRunning()) {
        sim.start();
    }
    // Use provided values or template defaults
    const effectiveSeverity = severity || template.defaultSeverity;
    const effectiveHorizon = horizonHours || template.defaultHorizonHours;
    // Map severity to numeric values
    const severityMap = {
        low: 0.4,
        medium: 0.65,
        high: 0.9,
    };
    const numericSeverity = severityMap[effectiveSeverity];
    // Calculate duration based on horizon
    const durationMs = effectiveHorizon * 60 * 60 * 1000;
    // Get nodes for targeting
    const nodes = sim.getNodes();
    const nodeIds = Object.keys(nodes);
    // Filter by target regions if specified
    const targetNodes = template.targetRegions.length > 0
        ? nodeIds.filter((id) => template.targetRegions.includes(nodes[id].region))
        : nodeIds;
    let result = {};
    // Execute based on scenario type
    switch (template.type) {
        case 'storm': {
            const region = template.targetRegions[0] || nodes[nodeIds[0]].region;
            const threat = sim.deployThreat({
                type: 'weather_stress',
                severity: numericSeverity,
                target: null,
                region,
                active: true,
                until: new Date(Date.now() + durationMs),
            });
            result.threatId = threat.id;
            // For high severity storms, also trigger cascade after delay
            if (effectiveSeverity === 'high' && targetNodes.length > 0) {
                const highRiskNode = targetNodes.find((id) => nodes[id].riskScore > 0.5) || targetNodes[0];
                setTimeout(() => {
                    const event = sim.triggerCascade(highRiskNode, numericSeverity * 0.8);
                    index_js_1.incidentStore.createFromCascade(event.id, event.originNode, event.affectedNodes, numericSeverity, templateId);
                }, 3000);
            }
            break;
        }
        case 'line_outage': {
            // Find transmission-related nodes
            const lineNodes = targetNodes.filter((id) => nodes[id].type === 'substation' || nodes[id].type === 'transformer');
            const target = lineNodes[0] || targetNodes[0];
            const threat = sim.deployThreat({
                type: 'equipment_failure',
                severity: numericSeverity,
                target,
                active: true,
                until: new Date(Date.now() + durationMs),
            });
            result.threatId = threat.id;
            // Trigger cascade from the affected line
            setTimeout(() => {
                const event = sim.triggerCascade(target, numericSeverity);
                index_js_1.incidentStore.createFromCascade(event.id, event.originNode, event.affectedNodes, numericSeverity, templateId);
                result.cascadeEventId = event.id;
            }, 2000);
            break;
        }
        case 'generator_loss': {
            // Find generator nodes
            const generatorNodes = targetNodes.filter((id) => nodes[id].type === 'generator');
            const target = generatorNodes[0] || targetNodes[0];
            const threat = sim.deployThreat({
                type: 'equipment_failure',
                severity: numericSeverity,
                target,
                active: true,
                until: new Date(Date.now() + durationMs),
            });
            result.threatId = threat.id;
            // Generator loss causes immediate impact
            const event = sim.triggerCascade(target, numericSeverity);
            index_js_1.incidentStore.createFromCascade(event.id, event.originNode, event.affectedNodes, numericSeverity, templateId);
            result.cascadeEventId = event.id;
            break;
        }
        case 'cascade_stress': {
            // Progressive stress test - multiple smaller cascades
            const numCascades = effectiveSeverity === 'high' ? 3 : effectiveSeverity === 'medium' ? 2 : 1;
            const staggerDelay = 5000;
            for (let i = 0; i < numCascades; i++) {
                const targetIndex = Math.floor((i / numCascades) * targetNodes.length);
                const target = targetNodes[targetIndex] || targetNodes[0];
                setTimeout(() => {
                    const event = sim.triggerCascade(target, numericSeverity * (0.6 + i * 0.15));
                    if (i === 0) {
                        index_js_1.incidentStore.createFromCascade(event.id, event.originNode, event.affectedNodes, numericSeverity, templateId);
                        result.cascadeEventId = event.id;
                    }
                }, i * staggerDelay);
            }
            break;
        }
    }
    // Log the scenario run
    index_js_1.logStore.addOperatorLog('scenario', `Scenario '${template.name}' started`, {
        templateId,
        severity: effectiveSeverity,
        horizonHours: effectiveHorizon,
        type: template.type,
    });
    res.json({
        success: true,
        message: `Scenario '${template.name}' started with ${effectiveSeverity} severity`,
        data: {
            templateId,
            templateName: template.name,
            type: template.type,
            severity: effectiveSeverity,
            horizonHours: effectiveHorizon,
            targetRegions: template.targetRegions,
            ...result,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=scenarios.js.map