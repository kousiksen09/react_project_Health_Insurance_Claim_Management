import { Router } from 'express';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: config.version,
    repoRoot: config.repoRoot,
    cursorConfigured: config.cursorConfigured,
    gitProvider: config.gitProvider,
    prProviderConfigured: config.prProviderConfigured,
    githubConfigured: config.githubConfigured,
    adoRepoConfigured: config.adoRepoConfigured,
    defaultBaseBranch: config.defaultBaseBranch,
    implementationPhase: 'Phase 6 — manual approval gate',
  });
});
