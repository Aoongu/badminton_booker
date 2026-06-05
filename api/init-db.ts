import pool from './db.js';

const CREATE_GRAB_TASKS = `
CREATE TABLE IF NOT EXISTS grab_tasks (
  id SERIAL PRIMARY KEY,
  openid VARCHAR(128) NOT NULL,
  user_name VARCHAR(64) DEFAULT '',
  token TEXT NOT NULL,
  target_time TIMESTAMP NOT NULL,
  lead_ms INT DEFAULT 0,
  booking_date DATE NOT NULL,
  cells JSONB NOT NULL,
  schedule_snapshot JSONB NOT NULL,
  people INT DEFAULT 5,
  status VARCHAR(32) DEFAULT 'pending',
  result TEXT,
  random_delay_ms INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

export async function initDB(): Promise<void> {
  try {
    // 创建表
    await pool.query(CREATE_GRAB_TASKS);
    // 创建索引
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grab_tasks_status ON grab_tasks(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grab_tasks_target ON grab_tasks(target_time)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grab_tasks_openid ON grab_tasks(openid)');
    console.log('[DB] Tables and indexes initialized');
  } catch (err) {
    console.error('[DB] Init error:', err);
    throw err;
  }
}
