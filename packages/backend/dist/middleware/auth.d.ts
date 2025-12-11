/**
 * Sentinel Grid Backend - Authentication Middleware
 * API key validation for protected endpoints
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    apiKeyValid?: boolean;
}
/**
 * API Key authentication middleware
 * Checks x-api-key header against configured key
 */
export declare function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Optional auth - sets flag but doesn't block
 */
export declare function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void;
