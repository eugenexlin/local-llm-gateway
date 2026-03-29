import express, { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import database from '../database';
import config from '../config';
import { ExtendedRequest } from '../middleware/auth';

const router = express.Router();

interface ProxyResult {
  status: number;
  response: any;
  duration: number;
}

// Proxy any request starting with /v1/
router.all('/v1/*', (req: ExtendedRequest, res: Response, next: (err?: any) => void) => {
  const relativePath = req.path.substring('/v1/'.length);
  (req as ExtendedRequest & { proxyPath: string }).proxyPath = relativePath;
  next();
}, (req: ExtendedRequest, res: Response) => {
  const keyData = req.keyData;

  const body = req.body;
  const targetUrl = config.llamaCppUrl;
  const relativePath = (req as ExtendedRequest & { proxyPath: string }).proxyPath;
  const endpoint = `/v1/${relativePath}`;

  // Log the request
  const requestId = `req_${Date.now()}`;
  database.logUsage({
    request_id: requestId,
    api_key_id: req.apiKeyId!,
    endpoint: endpoint,
    request_body: body,
    timestamp: new Date().toISOString()
  });

  // Proxy request
  proxyRequest(targetUrl, body, req.apiKeyId!, requestId, req.method, relativePath, (result: ProxyResult) => {
    // Log response
    database.logResponse({
      request_id: requestId,
      response_body: result.response,
      status_code: result.status,
      response_time_ms: result.duration
    });

    // Update API key stats
    database.incrementApiKeyStats(req.apiKeyId!);

    res.status(result.status).json(result.response);
  });
});

function proxyRequest(
  targetUrl: string,
  body: any,
  apiKeyId: string,
  requestId: string,
  method: string,
  relativePath: string,
  callback: (result: ProxyResult) => void
): void {
  const startTime: number = Date.now();
  const url = new URL(targetUrl);
  
  const protocol = url.protocol === 'https:' ? https : http;
  
  const options: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: relativePath,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'LLM-Firewall-Proxy/1.0'
    }
  };

  const req = protocol.request(options, (res: http.IncomingMessage) => {
    let data = '';
    
    res.on('data', (chunk: Buffer) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const duration: number = Date.now() - startTime;
      
      let response: any;
      try {
        response = JSON.parse(data);
      } catch (e) {
        response = { raw: data };
      }

      callback({
        status: res.statusCode as number,
        response,
        duration
      });
    });
  });

  req.on('error', (error: Error) => {
    const duration: number = Date.now() - startTime;
    callback({
      status: 500,
      response: { error: error.message },
      duration
    });
  });

  req.write(JSON.stringify(body));
  req.end();
}

export default router;
