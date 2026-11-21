const { withPostgres } = require('../connect');
const { createShortUrl, getUrlAnalytics, isValidUrl, listShortUrls } = require('../lib/url-service');

async function handleGenerateNewShortURL(req, res) {
  const originalUrl = String(req.body?.url || '').trim();

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isValidUrl(originalUrl)) {
    return res.status(400).json({ error: 'Please provide a valid absolute URL' });
  }

  const host = `${req.protocol}://${req.get('host')}`;

  try {
    const createdUrl = await withPostgres(process.env, (db) =>
      createShortUrl(db, originalUrl, host)
    );
    return res.json(createdUrl);
  } catch (error) {
    console.error('Unable to create short URL:', error);
    return res.status(500).json({ error: 'Unable to create short URL' });
  }
}

async function handleListUrls(req, res) {
  const idsParameter = new URL(req.originalUrl, 'http://localhost').searchParams.get('ids');
  const shortIds = idsParameter === null ? null : idsParameter.split(',').filter(Boolean);

  try {
    const entries = await withPostgres(process.env, (db) => listShortUrls(db, shortIds));
    return res.json(entries);
  } catch (error) {
    console.error('Unable to list short URLs:', error);
    return res.status(500).json({ error: 'Unable to list short URLs' });
  }
}

async function handleGetAnalytics(req, res) {
  const shortId = req.params.shortId;
  try {
    const result = await withPostgres(process.env, (db) => getUrlAnalytics(db, shortId));
    if (!result) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    return res.json(result);
  } catch (error) {
    console.error('Unable to load short URL analytics:', error);
    return res.status(500).json({ error: 'Unable to load short URL analytics' });
  }
}

module.exports = {
  handleGenerateNewShortURL,
  handleGetAnalytics,
  handleListUrls,
};
