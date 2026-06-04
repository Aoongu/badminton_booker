import app from './app.js';
import { initDB } from './init-db.js';
import { startScheduler } from './scheduler.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

initDB().then(() => {
  console.log('Database initialized');
  startScheduler();
}).catch((err) => {
  console.warn('Database init failed, running without DB:', err.message);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
