const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createShortUrl,
  getUrlAnalytics,
  isValidShortId,
  isValidUrl,
  listShortUrls,
  trackRedirect,
} = require('../lib/url-service');
const { createApp } = require('../index');

test('JSON API responses are not cached', async () => {
  const { jsonResponse } = await import('../lib/pages-utils.mjs');
  const response = jsonResponse([]);

  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('parses valid short codes and same-origin short URLs for dashboard tracking', async () => {
  const { getShortIdFromInput, isValidShortId } = await import('../public/url-utils.mjs');

  assert.equal(isValidShortId('kYztmZU0V'), true);
  assert.equal(getShortIdFromInput('kYztmZU0V', 'https://short.example'), 'kYztmZU0V');
  assert.equal(
    getShortIdFromInput('https://short.example/kYztmZU0V', 'https://short.example'),
    'kYztmZU0V'
  );
  assert.equal(
    getShortIdFromInput('https://other.example/kYztmZU0V', 'https://short.example'),
    null
  );
  assert.equal(
    getShortIdFromInput('https://short.example/kYztmZU0V?preview=1', 'https://short.example'),
    null
  );
});

test('createApp exposes URL validation without requiring a database', async () => {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));

  const port = server.address().port;

  const createRes = await fetch(`http://127.0.0.1:${port}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'not a URL' }),
  });

  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  assert.equal(createRes.status, 400);
});

test('validates absolute URLs', () => {
  assert.equal(isValidUrl('https://example.com/path'), true);
  assert.equal(isValidUrl('not a URL'), false);
});

test('creates a short URL in PostgreSQL and returns its public URL', async () => {
  let inserted;
  const db = {
    async query(sql, values) {
      assert.match(sql, /INSERT INTO short_urls/);
      inserted = values;
      return { rows: [{ short_id: values[0], redirect_url: values[1] }] };
    },
  };

  const result = await createShortUrl(db, 'https://example.com', 'https://short.example');

  assert.equal(result.shortId, inserted[0]);
  assert.equal(isValidShortId(result.shortId), true);
  assert.match(result.shortUrl, new RegExp(`^https://short\\.example/${result.shortId}$`));
  assert.equal(inserted[1], 'https://example.com');
});

test('accepts generated short IDs and rejects IDs with the wrong length or characters', () => {
  assert.equal(isValidShortId('a1B2c3D4e'), true);
  assert.equal(isValidShortId('a1B2c3D4'), false);
  assert.equal(isValidShortId('a1B2c3D4eF'), false);
  assert.equal(isValidShortId('a1B2c3D4!'), false);
});

test('returns no links for an empty localStorage ID list without querying PostgreSQL', async () => {
  const db = {
    async query() {
      assert.fail('an empty ID list must not query the database');
    },
  };

  assert.deepEqual(await listShortUrls(db, []), []);
});

test('loads current click counts from the database for saved short IDs', async () => {
  const db = {
    async query(sql, values) {
      assert.match(sql, /click_count/);
      assert.match(sql, /ANY\(\$1::text\[\]\)/);
      assert.deepEqual(values, [['kYztmZU0V']]);
      return {
        rows: [{
          short_id: 'kYztmZU0V',
          redirect_url: 'https://example.com',
          click_count: '12',
          last_visited: null,
        }],
      };
    },
  };

  const [link] = await listShortUrls(db, ['kYztmZU0V']);
  assert.equal(link.shortId, 'kYztmZU0V');
  assert.equal(link.totalClicks, 12);
});

test('returns stored click analytics', async () => {
  let queryCount = 0;
  const db = {
    async query() {
      queryCount += 1;
      return queryCount === 1
        ? { rows: [{ click_count: 1 }] }
        : { rows: [{ visited_at: '2026-01-01T00:00:00.000Z' }] };
    },
  };

  const result = await getUrlAnalytics(db, 'short123');
  assert.equal(result.totalClicks, 1);
  assert.equal(result.analytics[0].timestamp, Date.parse('2026-01-01T00:00:00.000Z'));
});

test('tracks a redirect and returns null for an unknown short ID', async () => {
  const db = {
    async query(sql, values) {
      assert.match(sql, /UPDATE short_urls/);
      assert.match(sql, /INSERT INTO url_visits/);
      assert.deepEqual(values, ['short123']);
      return { rows: [{ redirect_url: 'https://example.com' }] };
    },
  };

  assert.equal(await trackRedirect(db, 'short123'), 'https://example.com');
  assert.equal(
    await trackRedirect({ query: async () => ({ rows: [] }) }, 'unknown'),
    null
  );
});
