/**
 * Sentinel Grid Backend - Anchor Routes
 * POST /api/anchor, GET /api/anchors
 */
import { Request, Response } from 'express';
declare const router: import("express-serve-static-core").Router;
/**
 * POST /api/pin
 * Pin data to IPFS and return CID + hash
 */
export declare const pinHandler: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /api/verify
 * Verify a signature
 */
export declare const verifyHandler: (req: Request, res: Response, next: import("express").NextFunction) => void;
export default router;
