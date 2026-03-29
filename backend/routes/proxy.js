const express = require('express');
const http = require('http');
const https = require('https');
const database = require('../database');
const config = require('../config');

const router = express.Router();

// Proxy any request starting with /v1/
router.all('/v1/*', (req, res, next) => {
  const relativePath = req.path.substring('/v1/'.length);
  req.proxyPath = relativePath;
  next();
}, (req, res) => {
  const keyData = req.keyData;

  const body = req.body;
  const targetUrl = config.llamaCppUrl;
  const relativePath = req.proxyPath;
  const endpoint = `/v1/${relativePath}`;

  // Log the request
  const requestId = `req_${Date.now()}`;
  database.logUsage({
    request_id: requestId,
    api_key_id: req.apiKeyId,
    endpoint: endpoint,
    request_body: body,
    timestamp: new Date().toISOString()
  });

  // Proxy request
  proxyRequest(targetUrl, body, keyData.id, requestId, req.method, relativePath, (result) => {
    // Log response
    database.logResponse({
      request_id: requestId,
      response_body: result.response,
      status_code: result.status,
      response_time_ms: result.duration
    });

    // Update API key stats
    database.incrementApiKeyStats(req.apiKeyId);

    res.status(result.status).json(result.response);
  });
});

function proxyRequest(targetUrl, body, apiKeyId, requestId, callback, method, relativePath) {
  const startTime = Date.now();
  const url = new URL(targetUrl);
  
  const protocol = url.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: relativePath,
    method: method,
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
