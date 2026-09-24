const express = require('express');
const {
  handleGenerateNewShortURL,
  handleGetAnalytics,
  handleListUrls,
} = require('../controllers/url');

const router = express.Router();

router.get('/', handleListUrls);
router.post('/', handleGenerateNewShortURL);
router.get('/analytics/:shortId', handleGetAnalytics);

module.exports = router;