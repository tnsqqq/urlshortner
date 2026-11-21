const { Client } = require('pg');

function getConnectionString(env = process.env) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Set DATABASE_URL or configure the Cloudflare HYPERDRIVE binding');
  }

  return connectionString;
}

async function withPostgres(env, operation) {
  const client = new Client({ connectionString: getConnectionString(env) });
  await client.connect();

  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

module.exports = {
  getConnectionString,
  withPostgres,
};