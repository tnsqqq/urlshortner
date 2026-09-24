require('dotenv').config();

const express = require('express');
const path = require('path');
const { connectToMongoDB } = require('./connect');
const urlRoute = require('./routes/url');
const { getUrlRepository } = require('./models/url');

const PORT = process.env.PORT || 8001;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/short-url';

async function initializeDatabase() {
  try {
    await connectToMongoDB(MONGO_URI);
    console.log('MongoDB connected');
    return 'mongo';
  } catch (error) {
    console.warn('MongoDB not available. Running in memory mode.', error.message);
    return 'memory';
  }
}

function createApp() {
  const app = express();

  app.locals.databaseMode = 'memory';

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      databaseMode: app.locals.databaseMode,
    });
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use('/url', urlRoute);

  app.get('/:shortId', async (req, res) => {
    const { shortId } = req.params;
    const repository = getUrlRepository();
    const entry = await repository.findOne({ shortId });

    if (!entry) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    await repository.findOneAndUpdate(
      { shortId },
      {
        $inc: { clickCount: 1 },
        $push: {
          visitHistory: {
            timestamp: Date.now(),
          },
        },
      }
    );

    return res.redirect(entry.redirectURL);
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