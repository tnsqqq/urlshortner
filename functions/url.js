import urlService from '../lib/url-service.js';
import { jsonResponse, withDatabase } from '../lib/pages-utils.mjs';

export async function onRequestGet({ request, env }) {
  const idsParameter = new URL(request.url).searchParams.get('ids');
  const shortIds = idsParameter === null ? null : idsParameter.split(',').filter(Boolean);

  if (shortIds?.length > 100) {
    return jsonResponse({ error: 'Too many short URL IDs' }, 400);
  }

  return withDatabase(env, async (db) =>
    jsonResponse(await urlService.listShortUrls(db, shortIds))
  );
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400);
  }

  const originalUrl = String(body?.url || '').trim();
  if (!originalUrl) {
    return jsonResponse({ error: 'URL is required' }, 400);
  }
  if (!urlService.isValidUrl(originalUrl)) {
    return jsonResponse({ error: 'Please provide a valid absolute URL' }, 400);
  }

  return withDatabase(env, async (db) =>
    jsonResponse(
      await urlService.createShortUrl(db, originalUrl, new URL(request.url).origin)
    )
  );
}
