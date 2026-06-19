import { assertRuntimeConfig, config } from './config.js';
import { runStore } from './services/run-store.js';
import { startServer } from './server.js';

async function main(): Promise<void> {
  try {
    assertRuntimeConfig();
    await runStore.initialize();
    startServer();
  } catch (error) {
    console.error('[orchestrator] failed to start:', error);
    process.exit(1);
  }
}

void main();
