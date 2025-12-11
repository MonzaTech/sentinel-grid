"use strict";
/**
 * Sentinel Grid Backend - Express Application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const index_1 = __importDefault(require("./routes/index"));
function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false, // Disable for API
    }));
    // CORS
    app.use((0, cors_1.default)({
        origin: config_1.config.corsOrigin === '*' ? true : config_1.config.corsOrigin.split(','),
        credentials: true,
    }));
    // Rate limiting
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000, // 1 minute
        max: config_1.config.isDev ? 1000 : 100, // Higher limit in dev
        message: { error: 'Too many requests', message: 'Please try again later' },
    });
    app.use('/api', limiter);
    // Body parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Request logging in dev
    if (config_1.config.isDev) {
        app.use((req, _res, next) => {
            console.log(`${req.method} ${req.path}`);
            next();
        });
    }
    // Health check (no auth)
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // API routes
    // By default, use optional auth. API key auth can be enabled via REQUIRE_API_KEY=true
    const requireAuth = process.env.REQUIRE_API_KEY === 'true';
    if (requireAuth && config_1.config.isProd) {
        app.use('/api', auth_1.apiKeyAuth, index_1.default);
    }
    else {
        app.use('/api', auth_1.optionalAuth, index_1.default);
    }
    // Serve frontend static files in production
    // Frontend dist is at packages/frontend/dist from project root
    const frontendPath = path_1.default.resolve(process.cwd(), 'packages/frontend/dist');
    app.use(express_1.default.static(frontendPath));
    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req, res, next) => {
        // Skip API and WebSocket routes
        if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/health') {
            return next();
        }
        res.sendFile(path_1.default.join(frontendPath, 'index.html'), (err) => {
            if (err) {
                // If index.html doesn't exist, fall through to 404
                next();
            }
        });
    });
    // Error handling
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map