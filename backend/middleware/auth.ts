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

  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      message: 'Please provide an API key in the x-api-key header'
    });
    return;
  }

  const keyHash = hashKey(apiKey as string);

  const keyData = database.validateApiKey(keyHash);

  if (!keyData) {
    res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
    return;
  }

  req.apiKeyId = keyData.id;
  req.apiKeyHash = keyHash;
  req.keyData = keyData;

  next();
}

export { validateApiKey };
