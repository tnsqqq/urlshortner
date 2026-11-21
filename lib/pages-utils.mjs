import database from '../connect.js';

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function withDatabase(env, operation) {
  try {
    return await database.withPostgres(env, operation);
  } catch (error) {
    console.error('PostgreSQL request failed:', error);
    return jsonResponse({ error: 'Database request failed' }, 500);
  }
}
