/**
 * Sentinel Grid Backend - Error Handler Middleware
 */
import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}
/**
 * Central error handler
 */
export declare function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void;
/**
 * Not found handler
 */
export declare function notFoundHandler(req: Request, res: Response, _next: NextFunction): void;
/**
 * Async handler wrapper
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Create error with status code
 */
export declare function createError(statusCode: number, message: string, code?: string): AppError;
