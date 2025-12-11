"use strict";
/**
 * Sentinel Grid Backend - Error Handler Middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
exports.createError = createError;
const config_js_1 = require("../config.js");
const zod_1 = require("zod");
/**
 * Central error handler
 */
function errorHandler(err, _req, res, _next) {
    // Always log errors with full details
    console.error('=== API Error ===');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: err.errors,
        });
        return;
    }
    // Known errors with status codes
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        error: err.code || 'Error',
        message,
        ...(config_js_1.config.isDev && { stack: err.stack }),
    });
}
/**
 * Not found handler
 */
function notFoundHandler(req, res, _next) {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
}
/**
 * Async handler wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Create error with status code
 */
function createError(statusCode, message, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}
//# sourceMappingURL=errorHandler.js.map