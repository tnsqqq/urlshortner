require('dotenv').config({ path: ['.env.local', '.env'] });

const express = require('express');
const path = require('path');
const { withPostgres } = require('./connect');
const urlRoute = require('./routes/url');
const { trackRedirect } = require('./lib/url-service');

const PORT = process.env.PORT || 8001;

async function initializeDatabase() {
  await withPostgres(process.env, (db) => db.query('SELECT 1'));
  console.log('PostgreSQL connected');
  return 'postgres';
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
    try {
      const redirectURL = await withPostgres(process.env, (db) =>
        trackRedirect(db, req.params.shortId)
      );
      if (!redirectURL) {
        return res.status(404).json({ error: 'Short URL not found' });
      }
      return res.redirect(redirectURL);
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
};