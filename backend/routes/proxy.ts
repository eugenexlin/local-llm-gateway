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
  idempotencyKey: string | null;
  hasLogged: boolean;
  usageFound: boolean;
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

  // Proxy request with streaming
  proxyRequestStreaming(fullUrl, body, req.apiKeyId!, req.method, res, req.headers);
});

function proxyRequestStreaming(
  fullUrl: string,
  body: any,
  apiKeyId: string,
  method: string,
  res: Response,
  reqHeaders: any
): void {
  // Extract idempotency key from request headers (OpenAI standard)
  const idempotencyKey = (reqHeaders['idempotency-key'] || 
                          reqHeaders['x-idempotency-key'] || 
                          null) as string | null;

  const metrics: StreamMetrics = {
    statusCode: null,
    startTime: Date.now(),
    error: null,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    chunks: [],
    idempotencyKey: idempotencyKey,
    hasLogged: false,
    usageFound: false
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
      'User-Agent': 'LLM-Gateway/1.0'
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
      
      // Check for duplicate request via idempotency key
      if (metrics.idempotencyKey) {
        const existing = database.getDb()?.exec(
          'SELECT 1 FROM usage_logs WHERE idempotency_key = ?',
          [metrics.idempotencyKey]
        );
        
        if (existing.length > 0 && existing[0].values.length > 0) {
          console.log('Duplicate request detected (idempotency key already used), skipping logging');
          metrics.hasLogged = true;
          return;
        }
      }
      
      // Extract tokens from accumulated chunks
      const tokenResult = extractTokensFromStream(metrics.chunks);
      if (tokenResult) {
        metrics.promptTokens = tokenResult.promptTokens;
        metrics.completionTokens = tokenResult.completionTokens;
        metrics.totalTokens = tokenResult.totalTokens;
        metrics.usageFound = true;
      }
      
      // Fire-and-forget logging (non-blocking)
      setImmediate(() => {
        try {
          if (!metrics.usageFound || metrics.hasLogged) {
            console.log('Skipping logging: usage not found or already logged');
            return;
          }
          
          database.logUsage({
            api_key_id: apiKeyId,
            prompt_tokens: metrics.promptTokens,
            completion_tokens: metrics.completionTokens,
            total_tokens: metrics.totalTokens,
            duration_ms: duration,
            timestamp: new Date().toISOString(),
            idempotency_key: metrics.idempotencyKey,
            cache_creation_input_tokens: tokenResult?.cacheCreationInputTokens || 0,
            cache_read_input_tokens: tokenResult?.cacheReadInputTokens || 0
          });
          
          metrics.hasLogged = true;
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

    // Only log error requests that didn't already have usage logged
    if (!metrics.usageFound && !metrics.hasLogged) {
      setImmediate(() => {
        try {
          database.logUsage({
            api_key_id: apiKeyId,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            duration_ms: duration,
            timestamp: new Date().toISOString(),
            idempotency_key: metrics.idempotencyKey
          });
          metrics.hasLogged = true;
        } catch (logError) {
          console.error('Error logging error:', logError);
        }
      });
    }
  });

  upstreamReq.write(JSON.stringify(body));
  upstreamReq.end();
}

export default router;
