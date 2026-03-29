const express = require('express');
const database = require('../database');

const router = express.Router();

// Get usage logs
router.get('/usage', (req, res) => {
  try {
    const { limit, offset } = req.query;
    const logs = database.getUsageLogs({
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(logs);
  } catch (error) {
    console.error('Error getting usage logs:', error);
    res.status(500).json({ error: 'Failed to get usage logs' });
  }
});

// Get aggregated usage
router.get('/usage/aggregated', (req, res) => {
  try {
    const { period } = req.query;
    const aggregated = database.getAggregatedUsage(period || '7d');
    res.json(aggregated);
  } catch (error) {
    console.error('Error getting aggregated usage:', error);
    res.status(500).json({ error: 'Failed to get aggregated usage' });
  }
});

// Get usage summary
router.get('/usage/summary', (req, res) => {
  try {
    const summary = database.getUsageSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting usage summary:', error);
    res.status(500).json({ error: 'Failed to get usage summary' });
  }
});

module.exports = router;
