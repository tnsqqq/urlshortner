import urlService from '../../../lib/url-service.js';
import { jsonResponse, withDatabase } from '../../../lib/pages-utils.mjs';

export async function onRequestGet({ params, env }) {
  return withDatabase(env, async (db) => {
    const analytics = await urlService.getUrlAnalytics(db, params.shortId);
    return analytics
      ? jsonResponse(analytics)
      : jsonResponse({ error: 'Short URL not found' }, 404);
  });
}
