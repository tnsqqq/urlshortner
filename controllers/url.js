const shortid = require('shortid');
const { getUrlRepository } = require('../models/url');

function isValidUrl(input) {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

async function handleGenerateNewShortURL(req, res) {
  const originalUrl = String(req.body?.url || '').trim();

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isValidUrl(originalUrl)) {
    return res.status(400).json({ error: 'Please provide a valid absolute URL' });
  }

  const repository = getUrlRepository();
  let shortId = shortid.generate();

  while (await repository.findOne({ shortId })) {
    shortId = shortid.generate();
  }

  const createdEntry = await repository.create({
    shortId,
    redirectURL: originalUrl,
    clickCount: 0,
    visitHistory: [],
  });

  const host = `${req.protocol}://${req.get('host')}`;

  return res.json({
    id: shortId,
    shortId,
    shortUrl: `${host}/${shortId}`,
    redirectURL: createdEntry.redirectURL,
  });
}

async function handleListUrls(req, res) {
  const repository = getUrlRepository();
  const entries = await repository.find();

  return res.json(
    entries.map((entry) => ({
      shortId: entry.shortId,
      redirectURL: entry.redirectURL,
      totalClicks: Number(entry.clickCount ?? entry.visitHistory.length ?? 0),
      lastVisited: entry.visitHistory.at(-1)?.timestamp || null,
    }))
  );
}

async function handleGetAnalytics(req, res) {
  const shortId = req.params.shortId;
  const repository = getUrlRepository();
  const result = await repository.findOne({ shortId });

  if (!result) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  return res.json({
    shortId,
    totalClicks: Number(result.clickCount ?? result.visitHistory.length ?? 0),
    analytics: result.visitHistory,
  });
}

module.exports = {
  handleGenerateNewShortURL,
  handleGetAnalytics,
  handleListUrls,
};
