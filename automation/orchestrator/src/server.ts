import express from 'express';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { runsRouter } from './routes/runs.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter);
  app.use('/runs', authMiddleware, runsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`[orchestrator] listening on http://${config.host}:${config.port}`);
    console.log(`[orchestrator] repoRoot=${config.repoRoot}`);
    console.log(`[orchestrator] phase=7 (${config.gitProvider === 'ado-repos' ? 'Azure Repos' : 'GitHub'} PR — see PR_TEMPLATE_AUTOMATION.md)`);
    console.log(`[orchestrator] gitProvider=${config.gitProvider} prReady=${config.prProviderConfigured ? 'enabled' : 'not configured'}`);
    console.log(
      `[orchestrator] cursor=${config.cursorConfigured ? (config.cursor.dryRun ? 'dry-run' : 'enabled') : 'not configured'}`,
    );
  });
  return server;
}
