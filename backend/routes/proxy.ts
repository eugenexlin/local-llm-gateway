import express, { Request, Response } from 'express';
import { selectModel } from '../config';
import { ExtendedRequest } from '../middleware/auth';
import { proxyRequestToLlama } from '../utils/proxy-util';

const router = express.Router();

router.all('/*', (req: ExtendedRequest, res: Response, next: (err?: any) => void) => {
  const modelName = req.body.model || '';
  const match = selectModel(modelName);

  if (!match) {
    return res.status(404).json({
      error: 'Model not found',
      message: `No server configured for model "${modelName}"`,
    });
  }

  const pathWithoutLeadingSlash = req.path.substring(1);
  (req as ExtendedRequest & { proxyPath: string }).proxyPath = pathWithoutLeadingSlash;
  (req as ExtendedRequest & { proxyServer: any }).proxyServer = match.server;
  (req as ExtendedRequest & { proxyModelConfig: any }).proxyModelConfig = match.model;
  (req as ExtendedRequest & { proxyModel: string }).proxyModel = modelName;

  next();
}, (req: ExtendedRequest, res: Response) => {
  const keyData = req.keyData;

  const server = (req as ExtendedRequest & { proxyServer: any }).proxyServer;
  const modelConfig = (req as ExtendedRequest & { proxyModelConfig: any }).proxyModelConfig;
  const modelName = (req as ExtendedRequest & { proxyModel: string }).proxyModel;
  const pathWithoutLeadingSlash = (req as ExtendedRequest & { proxyPath: string }).proxyPath;
  const fullUrl = `${modelConfig.url}/${pathWithoutLeadingSlash}`;

  console.log(`[SERVER:${server.name}] [KEY:${req.apiKeyId}] ${req.method} ${fullUrl}`);

  proxyRequestToLlama(fullUrl, req.body, req.apiKeyId, req.method, res, req.headers, modelName);
});

export default router;