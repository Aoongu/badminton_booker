import app from './app.js';
import { initDB } from './init-db.js';
import { startScheduler } from './scheduler.js';

const PORT = process.env.PORT || 3001;

console.log('[BOOT] Starting server...');
console.log('[BOOT] NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('[BOOT] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
console.log('[BOOT] PORT:', PORT);

const server = app.listen(PORT, () => {
  console.log(`[BOOT] Server ready on port ${PORT}`);
});

initDB().then(() => {
  console.log('[BOOT] Database initialized');
  startScheduler();
}).catch((err) => {
  console.warn('[BOOT] Database init failed, running without DB:', err.message);
});

process.on('SIGTERM', () => {
  console.log('[BOOT] SIGTERM received');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[BOOT] SIGINT received');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('[BOOT] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[BOOT] Uncaught exception:', err);
});

export default app;
