"use strict";
/**
 * Sentinel Grid - Report Routes
 * Incident reports, accuracy metrics, operator logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../services/index.js");
const index_js_2 = require("../validation/index.js");
const index_js_3 = require("../stores/index.js");
const router = (0, express_1.Router)();
/**
 * GET /api/report/incidents
 * Generate incident summary report
 */
router.get('/incidents', (req, res) => {
    try {
        const validation = (0, index_js_2.validateRequest)(index_js_2.ReportQuerySchema, req.query);
        if (!validation.success) {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, validation.errors.join(', ')));
            return;
        }
        const { start, end } = validation.data;
        const report = index_js_1.ReportService.generateIncidentReport(start, end);
        index_js_3.logStore.addSystemLog('api', 'Incident report generated', {
            period: report.period,
            totalIncidents: report.totalIncidents,
        });
        res.json((0, index_js_2.createApiResponse)(true, report));
    }
    catch (error) {
        console.error('Error generating incident report:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to generate incident report'));
    }
});
/**
 * GET /api/report/accuracy
 * Generate prediction accuracy report
 */
router.get('/accuracy', (req, res) => {
    try {
        const validation = (0, index_js_2.validateRequest)(index_js_2.ReportQuerySchema, req.query);
        if (!validation.success) {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, validation.errors.join(', ')));
            return;
        }
        const { start, end } = validation.data;
        const report = index_js_1.ReportService.generateAccuracyReport(start, end);
        index_js_3.logStore.addSystemLog('api', 'Accuracy report generated', {
            period: report.period,
            totalPredictions: report.totalPredictions,
            accuracy: report.accuracy,
        });
        res.json((0, index_js_2.createApiResponse)(true, report));
    }
    catch (error) {
        console.error('Error generating accuracy report:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to generate accuracy report'));
    }
});
/**
 * GET /api/report/operator-log
 * Generate operator log report
 */
router.get('/operator-log', (req, res) => {
    try {
        const validation = (0, index_js_2.validateRequest)(index_js_2.ReportQuerySchema, req.query);
        if (!validation.success) {
            res.status(400).json((0, index_js_2.createApiResponse)(false, null, validation.errors.join(', ')));
            return;
        }
        const { start, end } = validation.data;
        const report = index_js_1.ReportService.generateOperatorLogReport(start, end);
        res.json((0, index_js_2.createApiResponse)(true, report));
    }
    catch (error) {
        console.error('Error generating operator log report:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to generate operator log report'));
    }
});
/**
 * POST /api/report/seed-demo-data
 * Seed demo data for reports (for demos)
 */
router.post('/seed-demo-data', (_req, res) => {
    try {
        index_js_1.ReportService.seedDemoReportData();
        res.json((0, index_js_2.createApiResponse)(true, { seeded: true }, 'Demo data seeded successfully'));
    }
    catch (error) {
        console.error('Error seeding demo data:', error);
        res.status(500).json((0, index_js_2.createApiResponse)(false, null, 'Failed to seed demo data'));
    }
});
exports.default = router;
//# sourceMappingURL=report.js.map