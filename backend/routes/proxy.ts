import express, { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import database from '../database';
import config from '../config';
import { ExtendedRequest } from '../middleware/auth';
import { extractTokensFromStream } from '../utils/streaming-token-parser';

const router = express.Router();

interface StreamMetrics {
  statusCode: number | null;
  startTime: number;
  error: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  chunks: Buffer[];
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

  const requestId = `req_${Date.now()}`;

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
    statusCode: null,
    startTime: Date.now(),
    error: null,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    chunks: []
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

    // Stream directly to client
    response.pipe(res);
    
    // Accumulate chunks for token extraction
    response.on('data', (chunk: Buffer) => {
      metrics.chunks.push(chunk);
    });
    
    // Log metrics when stream ends
    response.on('end', () => {
      const duration = Date.now() - metrics.startTime;
      
      // Extract tokens from accumulated chunks
      const tokenResult = extractTokensFromStream(metrics.chunks);
      if (tokenResult) {
        metrics.promptTokens = tokenResult.promptTokens;
        metrics.completionTokens = tokenResult.completionTokens;
        metrics.totalTokens = tokenResult.totalTokens;
      }
      
      // Fire-and-forget logging (non-blocking)
      setImmediate(() => {
        try {
          database.logUsage({
            request_id: requestId,
            api_key_id: apiKeyId,
            prompt_tokens: metrics.promptTokens,
            completion_tokens: metrics.completionTokens,
            total_tokens: metrics.totalTokens,
            duration_ms: duration,
            timestamp: new Date().toISOString()
          });
          
          // Update API key stats
          database.incrementApiKeyStats(apiKeyId);
        } catch (logError) {
          console.error('Error logging response:', logError);
        }
      });

      console.log('\n=== PROXY RESPONSE ===');
      console.log('Status:', metrics.statusCode);
      console.log('Duration:', duration, 'ms');
      console.log('Prompt Tokens:', metrics.promptTokens);
      console.log('Completion Tokens:', metrics.completionTokens);
      console.log('Total Tokens:', metrics.totalTokens);
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
    setImmediate(() => {
      try {
        database.logUsage({
          request_id: requestId,
          api_key_id: apiKeyId,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          duration_ms: duration,
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Error logging error:', logError);
      }
    });
  });

  upstreamReq.write(JSON.stringify(body));
  upstreamReq.end();
}

export default router;
