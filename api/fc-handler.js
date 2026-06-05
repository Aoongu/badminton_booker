import serverlessHttp from 'serverless-http';
import app from './app.js';
import { initDB } from './init-db.js';
import { startScheduler } from './scheduler.js';

// 初始化数据库和调度器
initDB().then(() => {
  console.log('[FC] Database initialized');
  startScheduler();
}).catch((err) => {
  console.warn('[FC] Database init failed:', err.message);
});

const handler = serverlessHttp(app);

export const handler = async (event, context) => {
  // 获取响应
  const response = await handler(event, context);
  return response;
};
