require('dotenv').config({ path: ['.env.local', '.env'] });

const express = require('express');
const path = require('path');
const { keepDatabaseWarm, withPostgres } = require('./connect');
const urlRoute = require('./routes/url');
const {
  findRedirectUrl,
  getCachedRedirect,
  incrementClickCount,
  isValidShortId,
} = require('./lib/url-service');

const PORT = process.env.PORT || 8001;
const keepAliveIntervalMillis = 4 * 60 * 1000;

async function initializeDatabase() {
  const startedAt = Date.now();
  await withPostgres(process.env, (db) => db.query('SELECT 1'));
  console.log(`[db] startup warmup_ms=${Date.now() - startedAt}`);
  return 'postgres';
}

function startDatabaseKeepAlive() {
  const timer = setInterval(() => {
    keepDatabaseWarm().catch((error) => {
      console.error('[db] keepalive failed:', error.message);
    });
  }, keepAliveIntervalMillis);
  timer.unref();
}

function createApp() {
  const app = express();

  app.locals.databaseMode = 'postgres';

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/health', (req, res) => {
    withPostgres(process.env, (db) => db.query('SELECT 1'))
      .then(() => res.json({ status: 'ok', databaseMode: 'postgres' }))
      .catch((error) => {
        console.error('PostgreSQL health check failed:', error);
        res.status(503).json({ status: 'error', databaseMode: 'postgres' });
      });
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use('/url', urlRoute);

  app.get('/:shortId', async (req, res) => {
    const startedAt = Date.now();
    const { shortId } = req.params;
    if (!isValidShortId(shortId)) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    try {
      let redirectURL = getCachedRedirect(shortId);
      if (redirectURL) {
        console.info('[redirect] lookup_ms=0 source=memory');
      } else {
        redirectURL = await withPostgres(process.env, (db) =>
          findRedirectUrl(db, shortId)
        );
      }

      if (!redirectURL) {
        return res.status(404).json({ error: 'Short URL not found' });
      }

      const response = res.redirect(302, redirectURL);
      console.info(`[redirect] total_ms=${Date.now() - startedAt}`);
      withPostgres(process.env, (db) => incrementClickCount(db, shortId)).catch((error) => {
        console.error(`[redirect] background increment failed for ${shortId}:`, error.message);
      });
      return response;
    } catch (error) {
      console.error('Unable to redirect short URL:', error);
      return res.status(500).json({ error: 'Unable to redirect short URL' });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createApp();

  initializeDatabase()
    .then((databaseMode) => {
      app.locals.databaseMode = databaseMode;
      startDatabaseKeepAlive();
      app.listen(PORT, () => console.log(`Server started at PORT: ${PORT} (${databaseMode} mode)`));
    })
    .catch((error) => {
      console.error('Unable to start server:', error);
      process.exit(1);
    });
}

module.exports = {
  createApp,
  initializeDatabase,
  startDatabaseKeepAlive,
};