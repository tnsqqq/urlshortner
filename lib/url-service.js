const { randomBytes } = require('node:crypto');

const shortIdAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function isValidUrl(input) {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

function generateShortId() {
  const bytes = randomBytes(9);
  return [...bytes].map((byte) => shortIdAlphabet[byte % shortIdAlphabet.length]).join('');
}

function isValidShortId(shortId) {
  return /^[0-9A-Za-z]{9}$/.test(shortId);
}

async function createShortUrl(db, originalUrl, origin) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortId = generateShortId();
    const result = await db.query(
      `INSERT INTO short_urls (short_id, redirect_url)
       VALUES ($1, $2)
       ON CONFLICT (short_id) DO NOTHING
       RETURNING short_id, redirect_url`,
      [shortId, originalUrl]
    );

    if (result.rows[0]) {
      return {
        id: shortId,
        shortId,
        shortUrl: `${origin}/${shortId}`,
        redirectURL: result.rows[0].redirect_url,
      };
    }
  }

  throw new Error('Unable to generate a unique short URL after several attempts');
}

async function listShortUrls(db, shortIds) {
  if (Array.isArray(shortIds) && shortIds.length === 0) {
    return [];
  }

  const result = Array.isArray(shortIds)
    ? await db.query(
        `SELECT short_id, redirect_url, click_count, last_visited
         FROM (
           SELECT u.short_id, u.redirect_url, u.click_count, u.created_at,
             (SELECT MAX(v.visited_at) FROM url_visits v WHERE v.short_id = u.short_id) AS last_visited
           FROM short_urls u
           WHERE u.short_id = ANY($1::text[])
         ) links
         ORDER BY created_at DESC`,
        [shortIds]
      )
    : await db.query(
        `SELECT u.short_id, u.redirect_url, u.click_count,
           (SELECT MAX(v.visited_at) FROM url_visits v WHERE v.short_id = u.short_id) AS last_visited
         FROM short_urls u
         ORDER BY u.created_at DESC`
      );

  return result.rows.map((row) => ({
    shortId: row.short_id,
    redirectURL: row.redirect_url,
    totalClicks: Number(row.click_count),
    lastVisited: row.last_visited ? new Date(row.last_visited).getTime() : null,
  }));
}

async function getUrlAnalytics(db, shortId) {
  const urlResult = await db.query(
    'SELECT click_count FROM short_urls WHERE short_id = $1',
    [shortId]
  );
  const url = urlResult.rows[0];
  if (!url) return null;

  const visitsResult = await db.query(
    `SELECT visited_at FROM url_visits
     WHERE short_id = $1
     ORDER BY visited_at ASC`,
    [shortId]
  );

  return {
    shortId,
    totalClicks: Number(url.click_count),
    analytics: visitsResult.rows.map((visit) => ({
      timestamp: new Date(visit.visited_at).getTime(),
    })),
  };
}

async function trackRedirect(db, shortId) {
  const result = await db.query(
    `WITH updated AS (
       UPDATE short_urls
       SET click_count = click_count + 1
       WHERE short_id = $1
       RETURNING short_id, redirect_url
     ), visit AS (
       INSERT INTO url_visits (short_id)
       SELECT short_id FROM updated
       RETURNING short_id
     )
     SELECT redirect_url FROM updated`,
    [shortId]
  );

  return result.rows[0]?.redirect_url || null;
}

module.exports = {
  createShortUrl,
  getUrlAnalytics,
  isValidShortId,
  isValidUrl,
  listShortUrls,
  trackRedirect,
};
