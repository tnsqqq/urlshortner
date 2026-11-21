const { Pool } = require('pg');

const poolOptions = {
  max: 4,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

let sharedPool;
let sharedConnectionString;

function getConnectionString(env = process.env) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Set DATABASE_URL or configure the Cloudflare HYPERDRIVE binding');
  }

  const parsedUrl = new URL(connectionString);
  parsedUrl.searchParams.set('sslmode', 'require');
  return parsedUrl.toString();
}

function logDatabaseTarget(connectionString, env) {
  const { hostname } = new URL(connectionString);
  const region = hostname.match(/\.([a-z0-9-]+)\.aws\.neon\.tech$/)?.[1];
  const usesPooler = hostname.includes('-pooler');

  console.info(
    `[db] Neon region=${region || 'unknown'}; pooled=${usesPooler || Boolean(env.HYPERDRIVE)}; source=${env.HYPERDRIVE ? 'Hyperdrive' : 'DATABASE_URL'}`
  );
  if (region) {
    const latencyNote = env.HYPERDRIVE
      ? '[db] Cloudflare Hyperdrive serves a global edge app; edge-to-Neon distance varies by request location.'
      : `[db] Run the Node.js app in or near ${region} to reduce database round-trip time.`;
    console.info(latencyNote);
  }
  if (!env.HYPERDRIVE && hostname.endsWith('.neon.tech') && !usesPooler) {
    console.warn('[db] DATABASE_URL is not a Neon pooled endpoint; use the hostname with -pooler.');
  }
}

function getPool(env = process.env) {
  const connectionString = getConnectionString(env);

  if (sharedPool) {
    if (sharedConnectionString !== connectionString) {
      throw new Error('Database connection settings changed after the shared pool was initialized');
    }
    return sharedPool;
  }

  sharedConnectionString = connectionString;
  logDatabaseTarget(connectionString, env);
  sharedPool = new Pool({ ...poolOptions, connectionString });
  sharedPool.on('connect', () => {
    console.info('[db] pooled client connected');
  });
  sharedPool.on('error', (error) => {
    console.error('[db] idle pooled client error:', error.message);
  });

  return sharedPool;
}

async function withPostgres(env, operation) {
  const pool = getPool(env);
  const startedAt = Date.now();
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    console.error(
      `[db] connect_or_acquire_ms=${Date.now() - startedAt} failed:`,
      error.message
    );
    throw error;
  }
  console.info(`[db] connect_or_acquire_ms=${Date.now() - startedAt}`);

  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

async function keepDatabaseWarm(env = process.env) {
  const startedAt = Date.now();
  await withPostgres(env, (db) => db.query('SELECT 1'));
  console.info(`[db] keepalive_ms=${Date.now() - startedAt}`);
}

module.exports = {
  getConnectionString,
  getPool,
  keepDatabaseWarm,
  poolOptions,
  withPostgres,
};