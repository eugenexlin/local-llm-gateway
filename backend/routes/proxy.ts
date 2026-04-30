import express, { Request, Response } from 'express';
import config from '../config';
import { ExtendedRequest } from '../middleware/auth';
import { proxyRequestToLlama } from '../utils/proxy-util';

const router = express.Router();

// Proxy any request starting with /v1/
router.all('/*', (req: ExtendedRequest, res: Response, next: (err?: any) => void) => {
  const pathWithoutLeadingSlash = req.path.substring(1);
  (req as ExtendedRequest & { proxyPath: string }).proxyPath = pathWithoutLeadingSlash;
  const fullUrl = `${config.llamaCppUrl}/${pathWithoutLeadingSlash}`;
  console.log(`${req.method} ${fullUrl}`);
  next();
}, (req: ExtendedRequest, res: Response) => {
  const keyData = req.keyData;

  const pathWithoutLeadingSlash = (req as ExtendedRequest & { proxyPath: string }).proxyPath;
  const fullUrl = `${config.llamaCppUrl}/${pathWithoutLeadingSlash}`;

  console.log(`[KEY:${req.apiKeyId}] ${req.method} ${fullUrl}`);

  // Proxy request with streaming
  proxyRequestToLlama(fullUrl, req.body, req.apiKeyId, req.method, res, req.headers);
});

export default router;
