import { Router } from 'express';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: config.version,
    repoRoot: config.repoRoot,
    cursorConfigured: config.cursorConfigured,
    githubConfigured: config.githubConfigured,
    defaultBaseBranch: config.defaultBaseBranch,
    implementationPhase: 'Phase 6 — manual approval gate',
  });
});
