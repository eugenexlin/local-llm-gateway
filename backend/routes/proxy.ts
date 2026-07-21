import express, { Request, Response } from 'express';
import { selectModel, getServers } from '../config';
import { ExtendedRequest } from '../middleware/auth';
import { proxyRequestToLlama } from '../utils/proxy-util';
import { getModelInfo } from '../utils/serverHealth';

const router = express.Router();

router.get('/models', (req: ExtendedRequest, res: Response) => {
  const modelInfo = getModelInfo();
  const servers = getServers();

  const data: any[] = [];
  for (const server of servers) {
    for (const model of server.models) {
      const info = modelInfo[model.name];
      if (!info) continue;

      const obj: any = {
        id: model.name,
        object: 'model',
        owned_by: info.ownedBy || server.name,
      };

      if (info.created !== undefined && info.created !== null) {
        obj.created = info.created;
      }
      if (info.contextLength !== null && info.contextLength !== undefined) {
        obj.max_model_len = info.contextLength;
        obj.meta = { n_ctx: info.contextLength };
      }

      data.push(obj);
    }
  }

  res.json({ object: 'list', data });
});

router.get('/models/:modelId', (req: ExtendedRequest, res: Response) => {
  const modelId = Array.isArray(req.params.modelId) ? req.params.modelId[0] : req.params.modelId;
  const modelInfo = getModelInfo();
  const info = modelInfo[modelId];

  if (!info) {
    return res.status(404).json({
      error: 'Model not found',
      message: `Model "${modelId}" not found`,
    });
  }

  const obj: any = {
    id: modelId,
    object: 'model',
    owned_by: info.ownedBy || '',
  };

  if (info.created !== undefined && info.created !== null) {
    obj.created = info.created;
  }
  if (info.contextLength !== null && info.contextLength !== undefined) {
    obj.max_model_len = info.contextLength;
    obj.meta = { n_ctx: info.contextLength };
  }

  res.json(obj);
});

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