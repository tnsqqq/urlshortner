import { jsonResponse, withDatabase } from '../lib/pages-utils.mjs';

export async function onRequestGet({ env }) {
  return withDatabase(env, async (db) => {
    await db.query('SELECT 1');
    return jsonResponse({ status: 'ok', databaseMode: 'postgres' });
  });
}
