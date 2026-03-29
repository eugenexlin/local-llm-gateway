const express = require('express');
const http = require('http');
const https = require('https');
const database = require('../database');
const config = require('../config');

const router = express.Router();

// Proxy chat completions
router.post('/', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Validate API key
  const keyData = database.validateApiKey(apiKey);
  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const body = req.body;
  const targetUrl = config.LLM_PROVIDER_URL;

  // Log the request
  const requestId = `req_${Date.now()}`;
  database.logUsage({
    request_id: requestId,
    api_key_id: keyData.id,
    endpoint: '/v1/chat/completions',
    request_body: body,
    timestamp: new Date().toISOString()
  });

  // Proxy request
  proxyRequest(targetUrl, body, keyData.id, requestId, (result) => {
    // Log response
    database.logResponse({
      request_id: requestId,
      response_body: result.response,
      status_code: result.status,
      response_time_ms: result.duration
    });

    // Update API key stats
    database.incrementApiKeyStats(keyData.id);

    res.status(result.status).json(result.response);
  });
});

function proxyRequest(targetUrl, body, apiKeyId, requestId, callback) {
  const startTime = Date.now();
  const url = new URL(targetUrl);
  
  const protocol = url.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'LLM-Firewall-Proxy/1.0'
    }
  };

  const req = protocol.request(options, (res) => {
    let data = '';
    
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      const duration = Date.now() - startTime;
      
      let response;
      try {
        response = JSON.parse(data);
      } catch (e) {
        response = { raw: data };
      }

      callback({
        status: res.statusCode,
        response,
        duration
      });
    });
  });

  req.on('error', (error) => {
    callback({
      status: 500,
      response: { error: error.message },
      duration: Date.now() - startTime
    });
  });

  req.write(JSON.stringify(body));
  req.end();
}

module.exports = router;
