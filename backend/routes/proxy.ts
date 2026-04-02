import express, { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import database from '../database';
import config from '../config';
import { ExtendedRequest } from '../middleware/auth';

const router = express.Router();

interface StreamMetrics {
  chunks: Buffer[];
  statusCode: number | null;
  headers: any;
  startTime: number;
  error: string | null;
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

  // Proxy request with streaming
  proxyRequestStreaming(fullUrl, body, req.apiKeyId!, requestId, req.method, res, req.headers);
});

function proxyRequestStreaming(
  fullUrl: string,
  body: any,
  apiKeyId: string,
  requestId: string,
  method: string,
  res: Response,
  reqHeaders: any
): void {
  const metrics: StreamMetrics = {
    chunks: [],
    statusCode: null,
    headers: null,
    startTime: Date.now(),
    error: null
  };

  const url = new URL(fullUrl);
  const protocol = url.protocol === 'https:' ? https : http;
  
  const contentType = (reqHeaders['content-type'] as string) || 'application/json';
  
  const options: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: method,
    headers: {
      'Content-Type': contentType,
      'User-Agent': 'LLM-Firewall-Proxy/1.0'
    }
  };
  
  const upstreamReq = protocol.request(options, (response: http.IncomingMessage) => {
    metrics.statusCode = response.statusCode ?? null;
    metrics.headers = response.headers;

    // Pipe response directly to client for streaming
    response.pipe(res);

    // Collect chunks for metrics
    response.on('data', (chunk: Buffer) => {
      metrics.chunks.push(chunk);
    });

    response.on('end', async () => {
      const duration = Date.now() - metrics.startTime;
      
      // Combine all chunks
      const buffer = Buffer.concat(metrics.chunks);
      const data = buffer.toString('utf-8');
      
      let responseBody: any;
      try {
        responseBody = JSON.parse(data);
      } catch (e) {
        responseBody = { raw: data };
      }

      // Log response asynchronously (non-blocking)
      try {
        database.logResponse({
          request_id: requestId,
          response_body: responseBody,
          status_code: metrics.statusCode as number,
          response_time_ms: duration
        });

        // Update API key stats
        database.incrementApiKeyStats(apiKeyId);
      } catch (logError) {
        console.error('Error logging response:', logError);
      }

      console.log('\n=== PROXY RESPONSE ===');
      console.log('Status:', metrics.statusCode);
      console.log('Duration:', duration, 'ms');
      console.log('====================\n');
    });
  });

  upstreamReq.on('error', (error: Error) => {
    metrics.error = error.message;
    const duration = Date.now() - metrics.startTime;
    
    console.error('Proxy error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }

    // Log error asynchronously
    database.logResponse({
      request_id: requestId,
      response_body: { error: error.message },
      status_code: 500,
      response_time_ms: duration
    });
  });

  upstreamReq.write(JSON.stringify(body));
  upstreamReq.end();
}

export default router;
