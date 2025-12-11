"use strict";
/**
 * Sentinel Grid Backend - Authentication Middleware
 * API key validation for protected endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.optionalAuth = optionalAuth;
const config_js_1 = require("../config.js");
/**
 * API Key authentication middleware
 * Checks x-api-key header against configured key
 */
function apiKeyAuth(req, res, next) {
    // Skip auth in development if no key set
    if (config_js_1.config.isDev && config_js_1.config.apiKey === 'demo-api-key-change-in-production') {
        req.apiKeyValid = true;
        return next();
    }
    const apiKey = req.header('x-api-key');
    if (!apiKey) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing x-api-key header',
        });
        return;
    }
    if (apiKey !== config_js_1.config.apiKey) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key',
        });
        return;
    }
    req.apiKeyValid = true;
    next();
}
/**
 * Optional auth - sets flag but doesn't block
 */
function optionalAuth(req, _res, next) {
    const apiKey = req.header('x-api-key');
    req.apiKeyValid = apiKey === config_js_1.config.apiKey;
    next();
}
//# sourceMappingURL=auth.js.map