import urlService from '../lib/url-service.js';
import { jsonResponse, withDatabase } from '../lib/pages-utils.mjs';

export async function onRequestGet({ params, env, next }) {
  if (!/^[0-9A-Za-z]{12}$/.test(params.shortId)) {
    return next();
  }

  return withDatabase(env, async (db) => {
    const redirectURL = await urlService.trackRedirect(db, params.shortId);
    return redirectURL
      ? Response.redirect(redirectURL, 302)
      : jsonResponse({ error: 'Short URL not found' }, 404);
  });
}
