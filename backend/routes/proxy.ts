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
router.all('/*', (req: ExtendedRequest, res: Response, next: (err?: any) => void) => {
  const pathWithoutLeadingSlash = req.path.substring(1);
  (req as ExtendedRequest & { proxyPath: string }).proxyPath = pathWithoutLeadingSlash;
  const fullUrl = `${config.llamaCppUrl}/${pathWithoutLeadingSlash}`;
  console.log('\n=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('Full URL:', fullUrl);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('====================\n');
  next();
}, (req: ExtendedRequest, res: Response) => {
  const keyData = req.keyData;

  const body = req.body;
  const targetUrl = config.llamaCppUrl;
  const pathWithoutLeadingSlash = (req as ExtendedRequest & { proxyPath: string }).proxyPath;
  const endpoint = `/v1/${pathWithoutLeadingSlash}`;
  const fullUrl = `${config.llamaCppUrl}/${pathWithoutLeadingSlash}`;

  console.log('\n=== FORWARDING REQUEST ===');
  console.log('API Key ID:', req.apiKeyId);
  console.log('Full URL:', fullUrl);
  console.log('Body: [HIDDEN]');
  console.log('====================\n');

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
  proxyRequest(fullUrl, body, req.apiKeyId!, requestId, req.method, (result: ProxyResult) => {
    console.log('\n=== PROXY RESPONSE ===');
    console.log('Status:', result.status);
    console.log('Duration:', result.duration, 'ms');
    console.log('Response:', JSON.stringify(result.response));
    console.log('====================\n');
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
  fullUrl: string,
  body: any,
  apiKeyId: string,
  requestId: string,
  method: string,
  callback: (result: ProxyResult) => void
): void {
  const startTime: number = Date.now();
  const url = new URL(fullUrl);
  
  const protocol = url.protocol === 'https:' ? https : http;
  
  const options: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
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
