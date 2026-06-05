const http = require('http');
const app = require('./api/app.js');
const { initDB } = require('./api/init-db.js');
const { startScheduler } = require('./api/scheduler.js');

const PORT = process.env.PORT || process.env.fc_http_port || 9000;

console.log('[FC] Starting Alibaba Cloud Function Compute Custom Runtime...');
console.log('[FC] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
console.log('[FC] PORT:', PORT);

let initialized = false;

async function initialize() {
  if (!initialized) {
    initialized = true;
    try {
      await initDB();
      console.log('[FC] Database initialized');
      startScheduler();
    } catch (err) {
      console.warn('[FC] Database init failed:', err.message);
    }
  }
}

// 初始化后启动服务器
initialize().then(() => {
  const server = http.createServer((req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 让 Express 处理请求
    app(req, res, (err) => {
      if (err) {
        console.error('[FC] Express error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`[FC] Server listening on port ${PORT}`);
  });

  // 处理优雅关闭
  process.on('SIGTERM', () => {
    console.log('[FC] SIGTERM received, shutting down...');
    server.close(() => {
      console.log('[FC] Server closed');
      process.exit(0);
    });
  });
}).catch((err) => {
  console.error('[FC] Initialization failed:', err);
  process.exit(1);
});
