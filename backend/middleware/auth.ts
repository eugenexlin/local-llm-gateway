import { Request, Response, NextFunction } from 'express';
import * as database from '../database';
import { hashKey } from '../utils/hash';

export interface ExtendedRequest extends Request {
  apiKeyId?: string;
  apiKeyHash?: string;
  keyData?: any;
}

function validateApiKey(req: ExtendedRequest, res: Response, next: NextFunction): void {
  if (!database.isReady()) {
    res.status(503).json({
      error: 'Service unavailable',
      message: 'Database not initialized'
    });
    return;
  }

  // Check X-API-Key header first
  const xApiKey = req.headers['x-api-key'];
  if (xApiKey && typeof xApiKey === 'string') {
    const keyHash = hashKey(xApiKey);
    const keyData = database.validateApiKey(keyHash);

    if (keyData) {
      req.apiKeyId = keyData.id;
      req.apiKeyHash = keyHash;
      req.keyData = keyData;
      return next();
    }
  }

  // Check Authorization header with Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerKey = authHeader.substring(7);
    const keyHash = hashKey(bearerKey);
    const keyData = database.validateApiKey(keyHash);

    if (keyData) {
      req.apiKeyId = keyData.id;
      req.apiKeyHash = keyHash;
      req.keyData = keyData;
      return next();
    }
  }

  res.status(401).json({
    error: 'API key required',
    message: 'Please provide an API key using either: Authorization: Bearer <key> or X-API-Key: <key>'
  });
}

export { validateApiKey };
