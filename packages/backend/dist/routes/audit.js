"use strict";
/**
 * Sentinel Grid Backend - Audit Routes
 * GET /api/audit
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const router = (0, express_1.Router)();
/**
 * GET /api/audit
 * Get audit log entries
 */
router.get('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { type, limit } = req.query;
    let entries;
    if (type) {
        entries = index_js_1.auditRepo.getByType.all(type);
    }
    else if (limit) {
        entries = index_js_1.auditRepo.getRecent.all(parseInt(limit, 10));
    }
    else {
        entries = index_js_1.auditRepo.getAll.all();
    }
    res.json({
        success: true,
        count: entries.length,
        data: entries.map((e) => ({
            ...e,
            dataSummary: e.data_summary ? JSON.parse(e.data_summary) : null,
        })),
    });
}));
/**
 * GET /api/audit/types
 * Get available audit event types
 */
router.get('/types', (_req, res) => {
    res.json({
        success: true,
        data: [
            'system_start',
            'system_stop',
            'prediction_generated',
            'auto_mitigation',
            'manual_mitigation',
            'batch_mitigation',
            'threat_deployment',
            'cascade_event',
            'proactive_action_executed',
            'alert_triggered',
            'config_changed',
            'anchor_created',
            'pin_created',
        ],
    });
});
/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', (0, errorHandler_js_1.asyncHandler)(async (_req, res) => {
    const entries = index_js_1.auditRepo.getAll.all();
    // Count by type
    const byType = entries.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {});
    // Recent activity (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentCount = entries.filter((e) => e.timestamp > oneDayAgo).length;
    res.json({
        success: true,
        data: {
            total: entries.length,
            recentCount,
            byType,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=audit.js.map