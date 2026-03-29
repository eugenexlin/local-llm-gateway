const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database');
const { generateApiKey, hashApiKey } = require('../utils/hash');

const router = express.Router();

// Create API key
router.post('/', (req, res) => {
  try {
    const { name, description, user_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const rawApiKey = generateApiKey();
    const hashedKey = hashApiKey(rawApiKey);
    
    database.createApiKey({
      id,
      name,
      description: description || null,
      api_key: hashedKey,
      user_id: user_id || null
    });

    res.status(201).json({
      id,
      name,
      description: description || null,
      api_key: rawApiKey,
      created_at: new Date().toISOString(),
      user_id: user_id || null
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// List API keys
router.get('/', (req, res) => {
  try {
    const apiKeys = database.getApiKeys();
    res.json(apiKeys.map(({ id, name, description, created_at, user_id }) => ({
      id,
      name,
      description,
      created_at,
      user_id
    })));
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// Revoke API key
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = database.deleteApiKey(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({ message: 'API key revoked' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Get API key stats
router.get('/:id/stats', (req, res) => {
  try {
    const { id } = req.params;
    const stats = database.getApiKeyStats(id);
    
    if (!stats) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting API key stats:', error);
    res.status(500).json({ error: 'Failed to get API key stats' });
  }
});

module.exports = router;
