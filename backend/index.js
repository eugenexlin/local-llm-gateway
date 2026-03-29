const express = require('express');
const cors = require('cors');
require('dotenv').config();

const database = require('./database');
const auth = require('./middleware/auth');
const apiKeys = require('./routes/apiKeys');
const metrics = require('./routes/metrics');
const proxy = require('./routes/proxy');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/api-keys', apiKeys);
app.use('/api/stats', metrics);
app.use('/v1', auth.validateApiKey, proxy);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
database.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LLM Firewall Proxy running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
