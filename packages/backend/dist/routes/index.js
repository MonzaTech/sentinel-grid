"use strict";
/**
 * Sentinel Grid Backend - Route Aggregator
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_1 = __importDefault(require("./system"));
const nodes_1 = __importDefault(require("./nodes"));
const predictions_1 = __importDefault(require("./predictions"));
const simulate_1 = __importDefault(require("./simulate"));
const actions_1 = __importDefault(require("./actions"));
const audit_1 = __importDefault(require("./audit"));
const anchor_1 = __importDefault(require("./anchor"));
const logs_1 = __importDefault(require("./logs"));
const scenarios_1 = __importDefault(require("./scenarios"));
const incidents_1 = __importDefault(require("./incidents"));
const topology_1 = __importDefault(require("./topology"));
const report_1 = __importDefault(require("./report"));
const demo_1 = __importDefault(require("./demo"));
const router = (0, express_1.Router)();
// Mount routes
router.use('/system', system_1.default);
router.use('/nodes', nodes_1.default);
router.use('/predictions', predictions_1.default);
router.use('/simulate', simulate_1.default);
router.use('/actions', actions_1.default);
router.use('/audit', audit_1.default);
router.use('/anchors', anchor_1.default);
router.use('/anchor', anchor_1.default); // Alias
router.use('/logs', logs_1.default);
router.use('/scenarios', scenarios_1.default);
router.use('/incidents', incidents_1.default);
router.use('/topology', topology_1.default);
router.use('/report', report_1.default);
router.use('/demo', demo_1.default);
// Import pin and verify handlers directly for top-level routes
const anchor_2 = require("./anchor");
router.post('/pin', anchor_2.pinHandler);
router.post('/verify', anchor_2.verifyHandler);
// Root endpoint
router.get('/', (_req, res) => {
    res.json({
        name: 'Sentinel Grid API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
            system: [
                'GET  /api/system/state',
                'GET  /api/system/health',
                'GET  /api/system/metrics',
                'POST /api/system/start',
                'POST /api/system/stop',
                'POST /api/system/reset',
            ],
            nodes: [
                'GET  /api/nodes',
                'GET  /api/nodes/summary',
                'GET  /api/nodes/critical',
                'GET  /api/nodes/:id',
            ],
            predictions: [
                'GET  /api/predictions',
                'GET  /api/predictions/patterns',
                'GET  /api/predictions/accuracy',
            ],
            simulate: [
                'POST /api/simulate/cascade',
                'POST /api/simulate/threat',
                'DELETE /api/simulate/threat',
                'POST /api/simulate/scenario',
            ],
            actions: [
                'GET  /api/actions/recommendations',
                'POST /api/actions/mitigate',
                'POST /api/actions/mitigate/batch',
                'POST /api/actions/mitigate/critical',
            ],
            incidents: [
                'GET  /api/incidents',
                'GET  /api/incidents/:id',
                'PATCH /api/incidents/:id',
                'POST /api/incidents/:id/mitigation',
                'POST /api/incidents/:id/close',
                'POST /api/incidents/:id/anchor',
            ],
            scenarios: [
                'GET  /api/scenarios/templates',
                'GET  /api/scenarios/templates/:id',
                'POST /api/scenarios/run',
            ],
            report: [
                'GET  /api/report/incidents',
                'GET  /api/report/accuracy',
                'GET  /api/report/operator-log',
            ],
            demo: [
                'GET  /api/demo/available',
                'GET  /api/demo/state',
                'POST /api/demo/run',
                'POST /api/demo/reset',
            ],
            topology: [
                'GET  /api/topology',
                'POST /api/topology/import',
                'DELETE /api/topology',
                'GET  /api/topology/summary',
            ],
            anchor: [
                'GET  /api/anchors',
                'POST /api/anchor',
                'GET  /api/anchor/status',
                'POST /api/pin',
            ],
            logs: [
                'GET  /api/logs',
                'GET  /api/logs/export',
            ],
            audit: [
                'GET  /api/audit',
            ],
        },
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map