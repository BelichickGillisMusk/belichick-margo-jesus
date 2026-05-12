import { createSamanthaApp } from './server.js';
import { SAMANTHA_CONFIG } from './config.js';
import { isMainModule } from '../shared/runtime-contract.js';

export function startSamanthaServer() {
  const app = createSamanthaApp();
  return app.listen(SAMANTHA_CONFIG.port, '0.0.0.0', () => {
    console.log(`🛰️  Samantha running on port ${SAMANTHA_CONFIG.port}`);
    console.log(`   GET  /api/samantha/status`);
    console.log(`   POST /api/samantha/chat`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY is not set — chat will return 503 until configured.');
    }
  });
}

if (isMainModule(import.meta)) {
  startSamanthaServer();
}
