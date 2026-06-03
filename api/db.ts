import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

function parseDatabaseUrl(url: string): mysql.PoolOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? parseInt(parsed.port, 10) : 3306,
    user: parsed.username || 'root',
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.slice(1) || 'badminton_booker',
  };
}

const poolOptions: mysql.PoolOptions = process.env.DATABASE_URL
  ? parseDatabaseUrl(process.env.DATABASE_URL)
  : {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'badminton_booker',
    };

const pool = mysql.createPool(poolOptions);

export default pool;
