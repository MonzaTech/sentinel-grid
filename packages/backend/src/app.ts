/**
 * Sentinel Grid Backend - Express Application
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { apiKeyAuth, optionalAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes/index';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
  }));

  // CORS
  app.use(cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.isDev ? 1000 : 100, // Higher limit in dev
    message: { error: 'Too many requests', message: 'Please try again later' },
  });
  app.use('/api', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging in dev
  if (config.isDev) {
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
  if (requireAuth && config.isProd) {
    app.use('/api', apiKeyAuth, routes);
  } else {
    app.use('/api', optionalAuth, routes);
  }

  // Serve frontend static files in production
  // Frontend dist is at packages/frontend/dist from project root
  const frontendPath = path.resolve(process.cwd(), 'packages/frontend/dist');
  app.use(express.static(frontendPath));
  
  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    // Skip API and WebSocket routes
    if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        // If index.html doesn't exist, fall through to 404
        next();
      }
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
