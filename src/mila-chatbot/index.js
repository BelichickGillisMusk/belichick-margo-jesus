import { createMilaApp } from './server.js';
import { MILA_CONFIG } from './config.js';
import { isMainModule } from '../shared/runtime-contract.js';

export function startMilaServer() {
  const { app, knowledgeBase } = createMilaApp();
  return app.listen(MILA_CONFIG.port, () => {
    console.log(`🤖 Mila CARB chatbot running on http://localhost:${MILA_CONFIG.port}`);
    console.log(`💬 Chat API: POST http://localhost:${MILA_CONFIG.port}/chat`);
    console.log(`🖥️  Widget: http://localhost:${MILA_CONFIG.port}/widget`);
    console.log(`📋 Knowledge base loaded (${knowledgeBase.characters} chars)`);
  });
}

if (isMainModule(import.meta)) {
  startMilaServer();
}
