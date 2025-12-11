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
        endpoints: [
            'GET  /api/system/state',
            'GET  /api/system/health',
            'GET  /api/system/metrics',
            'POST /api/system/start',
            'POST /api/system/stop',
            'POST /api/system/reset',
            'GET  /api/nodes',
            'GET  /api/nodes/summary',
            'GET  /api/nodes/critical',
            'GET  /api/nodes/:id',
            'GET  /api/predictions',
            'GET  /api/predictions/patterns',
            'GET  /api/predictions/accuracy',
            'POST /api/simulate/cascade',
            'POST /api/simulate/threat',
            'POST /api/simulate/scenario',
            'POST /api/actions/mitigate',
            'POST /api/actions/mitigate/batch',
            'POST /api/actions/mitigate/critical',
            'GET  /api/audit',
            'POST /api/anchor',
            'GET  /api/anchors',
            'POST /api/pin',
            'GET  /api/logs',
            'GET  /api/logs/export',
            'GET  /api/scenarios/templates',
            'POST /api/scenarios/run',
            'GET  /api/incidents',
            'GET  /api/incidents/:id',
            'POST /api/incidents/:id/anchor',
            'GET  /api/topology',
            'POST /api/topology/import',
        ],
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map