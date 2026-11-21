const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createShortUrl,
  getUrlAnalytics,
  isValidUrl,
  listShortUrls,
  trackRedirect,
} = require('../lib/url-service');
const { createApp } = require('../index');

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
  assert.match(result.shortUrl, new RegExp(`^https://short\\.example/${result.shortId}$`));
  assert.equal(inserted[1], 'https://example.com');
});

test('returns no links for an empty localStorage ID list without querying PostgreSQL', async () => {
  const db = {
    async query() {
      assert.fail('an empty ID list must not query the database');
    },
  };

  assert.deepEqual(await listShortUrls(db, []), []);
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
