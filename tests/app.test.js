const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../index');

test('createApp starts without a live MongoDB server and exposes URL routes', async () => {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));

  const port = server.address().port;

  const createRes = await fetch(`http://127.0.0.1:${port}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  });

  assert.equal(createRes.status, 200);
  const created = await createRes.json();
  assert.ok(created.shortUrl);
  assert.ok(created.shortId);

  const analyticsRes = await fetch(`http://127.0.0.1:${port}/url/analytics/${created.shortId}`);
  assert.equal(analyticsRes.status, 200);
  const analytics = await analyticsRes.json();
  assert.equal(typeof analytics.totalClicks, 'number');

  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
