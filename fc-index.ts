import type { Context } from '@ali FC/types';
import app from './app.js';
import { initDB } from './init-db.js';
import { startScheduler } from './scheduler.js';

console.log('[FC] Starting Alibaba Cloud Function Compute...');
console.log('[FC] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');

let initialized = false;

export async function handler(req: any, ctx: Context, callback: any) {
  // 初始化数据库和调度器（只执行一次）
  if (!initialized) {
    initialized = true;
    try {
      await initDB();
      console.log('[FC] Database initialized');
      startScheduler();
    } catch (err: any) {
      console.warn('[FC] Database init failed:', err.message);
    }
  }

  // 获取端口（阿里云函数计算提供）
  const port = process.env.fc_http_port || 9000;

  // 使用 fc-http 适配器处理请求
  const { handleRequest } = await import('@alicloud/fc-http');
  const server = handleRequest(app);
  return server(req, ctx, callback);
}
