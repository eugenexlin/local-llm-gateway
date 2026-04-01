import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

import * as database from './database';
import { validateApiKey } from './middleware/auth';
import apiKeys from './routes/apiKeys';
import metrics from './routes/metrics';
import proxy from './routes/proxy';
import config from './config';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/api-keys', apiKeys);
app.use('/api/metrics', metrics);
app.use('/v1', validateApiKey, proxy);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
