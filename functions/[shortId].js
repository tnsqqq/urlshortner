import urlService from '../lib/url-service.js';
import database from '../connect.js';
import { jsonResponse, withDatabase } from '../lib/pages-utils.mjs';

export async function onRequestGet(context) {
  const { params, env, next } = context;
  if (!urlService.isValidShortId(params.shortId)) {
    return next();
  }

  const startedAt = Date.now();
  let redirectURL = urlService.getCachedRedirect(params.shortId);
  if (redirectURL) {
    console.info('[redirect] lookup_ms=0 source=memory');
  } else {
    redirectURL = await withDatabase(env, (db) =>
      urlService.findRedirectUrl(db, params.shortId)
    );
    if (redirectURL instanceof Response) {
      return redirectURL;
    }
  }

  if (!redirectURL) {
    return jsonResponse({ error: 'Short URL not found' }, 404);
  }

  const response = Response.redirect(redirectURL, 302);
  console.info(`[redirect] total_ms=${Date.now() - startedAt}`);
  const increment = database
    .withPostgres(env, (db) => urlService.incrementClickCount(db, params.shortId))
    .catch((error) => {
      console.error(
        `[redirect] background increment failed for ${params.shortId}:`,
        error.message
      );
    });
  context.waitUntil(increment);
  return response;
}
