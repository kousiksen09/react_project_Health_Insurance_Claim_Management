import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiKey) {
    res.status(503).json({
      error: {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'ORCHESTRATOR_API_KEY is not set on the server.',
      },
    });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing Authorization: Bearer <ORCHESTRATOR_API_KEY>' },
    });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (token !== config.apiKey) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid API key.' },
    });
    return;
  }

  next();
}
