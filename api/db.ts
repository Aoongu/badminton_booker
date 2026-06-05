import pg from 'pg';

const { Pool } = pg;

function parsePostgresUrl(url: string): pg.PoolConfig {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    user: parsed.username || 'postgres',
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.slice(1) || 'badminton_booker',
  };
}

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''

const poolConfig: pg.PoolConfig = dbUrl
  ? parsePostgresUrl(dbUrl)
  : {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '',
      database: 'badminton_booker',
    };

console.log('[DB] Config:', poolConfig.host, ':', poolConfig.port, '/', poolConfig.database);

const pool = new Pool({
  ...poolConfig,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
