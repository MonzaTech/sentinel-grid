/**
 * Sentinel Grid Backend - Authentication Middleware
 * API key validation for protected endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface AuthenticatedRequest extends Request {
  apiKeyValid?: boolean;
}

/**
 * API Key authentication middleware
 * Checks x-api-key header against configured key
 */
export function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth in development if no key set
  if (config.isDev && config.apiKey === 'demo-api-key-change-in-production') {
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
  
  if (apiKey !== config.apiKey) {
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
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const apiKey = req.header('x-api-key');
  req.apiKeyValid = apiKey === config.apiKey;
  next();
}
