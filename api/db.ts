import mysql from 'mysql2/promise';

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

const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || ''

const poolOptions: mysql.PoolOptions = dbUrl
  ? parseDatabaseUrl(dbUrl)
  : {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'badminton_booker',
    };

console.log('[DB] Config:', poolOptions.host, ':', poolOptions.port, '/', poolOptions.database);

const pool = mysql.createPool({
  ...poolOptions,
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 5000,
});

export default pool;
