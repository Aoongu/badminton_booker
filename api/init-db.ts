import pool from './db.js';

const CREATE_GRAB_TASKS = `
CREATE TABLE IF NOT EXISTS grab_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(128) NOT NULL,
  user_name VARCHAR(64) DEFAULT '',
  token TEXT NOT NULL,
  target_time DATETIME NOT NULL,
  lead_ms INT DEFAULT 0,
  booking_date DATE NOT NULL,
  cells JSON NOT NULL,
  schedule_snapshot JSON NOT NULL,
  people INT DEFAULT 5,
  status ENUM('pending','running','success','failed','cancelled') DEFAULT 'pending',
  result TEXT,
  random_delay_ms INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_target (target_time),
  INDEX idx_openid (openid)
)
`;

export async function initDB(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.query(CREATE_GRAB_TASKS);
  } finally {
    conn.release();
  }
}
