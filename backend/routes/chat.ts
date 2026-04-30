import express, { Request, Response } from 'express';
import config from '../config';
import database from '../database';
import { proxyRequestToLlama } from '../utils/proxy-util';
import { requireAuth, SessionRequest } from '../middleware/auth';

const router = express.Router();

// Session-authenticated chat completions endpoint
// The API key ID is used purely for usage logging, not for authentication
router.post('/completions', requireAuth, (req: SessionRequest, res: Response) => {
  try {
    const { key_id } = req.body as { key_id?: string };
    const userId = req.user?.id;

    if (!key_id) {
      return res.status(400).json({ error: 'key_id is required' });
    }

    // Validate the API key exists and belongs to the current user
    const keyData = database.getApiKeyById(key_id);
    if (!keyData) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (keyData.user_id !== userId) {
      return res.status(403).json({ error: 'API key does not belong to this user' });
    }

    if (keyData.is_active !== 1) {
      return res.status(400).json({ error: 'API key is not active' });
    }

    const fullUrl = `${config.llamaCppUrl}/chat/completions`;

    if (process.env.SUPPRESS_CONSOLE !== 'true') {
      console.log(`[KEY:${key_id}] ${req.method} ${fullUrl}`);
    }

    delete req.body.key_id
    proxyRequestToLlama(fullUrl, req.body, key_id, req.method, res, req.headers);
  } catch (error) {
    console.error('Chat completions error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
