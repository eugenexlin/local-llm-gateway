const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'llm_firewall.db');

let db = null;
let SQL = null;
let initialized = false;

async function init() {
  const SQLConstructor = await initSqlJs();
  SQL = SQLConstructor;

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createSchema();
    saveDatabase();
  }

  console.log('Database initialized');
  initialized = true;
}

function isReady() {
  return initialized;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      description TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_used_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      api_key_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_body TEXT,
      response_body TEXT,
      status_code INTEGER,
      request_tokens INTEGER DEFAULT 0,
      response_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_keys(key_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_api_key_id ON usage_logs(api_key_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp)`);
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function createApiKey({ id, name, key_hash, description, user_id }) {
  db.run(
    'INSERT INTO api_keys (id, name, key_hash, description, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, key_hash, description || null, user_id || null, new Date().toISOString()]
  );
  saveDatabase();
}

function getApiKeys() {
  const result = db.exec('SELECT id, name, description, created_at, user_id FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC');
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function deleteApiKey(id) {
  db.run('UPDATE api_keys SET is_active = 0 WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

function validateApiKey(keyHash) {
  const result = db.exec(
    'SELECT id, name, created_at, is_active, last_used_at FROM api_keys WHERE key_hash = ? AND is_active = 1',
    [keyHash]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = result[0].values[0];
  const columns = result[0].columns;
  
  const keyData = {};
  columns.forEach((col, i) => {
    keyData[col] = row[i];
  });
  
  return keyData;
}

function logUsage({ request_id, api_key_id, endpoint, request_body, timestamp }) {
  db.run(
    'INSERT INTO usage_logs (id, request_id, api_key_id, endpoint, request_body, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [request_id, request_id, api_key_id, endpoint, JSON.stringify(request_body), timestamp]
  );
  saveDatabase();
}

function logResponse({ request_id, response_body, status_code, response_time_ms }) {
  db.run(
    'UPDATE usage_logs SET response_body = ?, status_code = ?, latency_ms = ? WHERE request_id = ?',
    [JSON.stringify(response_body), status_code, response_time_ms, request_id]
  );
  saveDatabase();
}

function incrementApiKeyStats(apiKeyId) {
  db.run(
    'UPDATE api_keys SET last_used_at = ? WHERE id = ?',
    [new Date().toISOString(), apiKeyId]
  );
  saveDatabase();
}

function getUsageLogs({ limit = 100, offset = 0 }) {
  const result = db.exec(
    `SELECT ul.*, ak.name as api_key_name 
     FROM usage_logs ul 
     JOIN api_keys ak ON ul.api_key_id = ak.id 
     ORDER BY ul.timestamp DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function getAggregatedUsage(period = '7d') {
  const days = parseInt(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const result = db.exec(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(request_tokens) as total_input_tokens,
      SUM(response_tokens) as total_output_tokens,
      AVG(latency_ms) as avg_latency_ms
    FROM usage_logs 
    WHERE timestamp > ?
  `, [startDate]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return {
      total_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      avg_latency_ms: 0
    };
  }
  
  const row = result[0].values[0];
  return {
    total_requests: row[0] || 0,
    total_input_tokens: row[1] || 0,
    total_output_tokens: row[2] || 0,
    avg_latency_ms: row[3] ? parseFloat(row[3].toFixed(2)) : 0
  };
}

function getUsageSummary() {
  const result = db.exec(`
    SELECT 
      COUNT(DISTINCT api_key_id) as active_keys,
      COUNT(*) as total_requests,
      SUM(request_tokens) as total_input_tokens,
      SUM(response_tokens) as total_output_tokens
    FROM usage_logs
  `);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return {
      active_keys: 0,
      total_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0
    };
  }
  
  const row = result[0].values[0];
  return {
    active_keys: row[0] || 0,
    total_requests: row[1] || 0,
    total_input_tokens: row[2] || 0,
    total_output_tokens: row[3] || 0
  };
}

function getApiKeyStats(apiKeyId) {
  const result = db.exec(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(request_tokens) as total_input_tokens,
      SUM(response_tokens) as total_output_tokens,
      AVG(latency_ms) as avg_latency_ms
    FROM usage_logs 
    WHERE api_key_id = ?
  `, [apiKeyId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = result[0].values[0];
  return {
    total_requests: row[0] || 0,
    total_input_tokens: row[1] || 0,
    total_output_tokens: row[2] || 0,
    avg_latency_ms: row[3] ? parseFloat(row[3].toFixed(2)) : 0
  };
}

module.exports = {
  init,
  isReady,
  createApiKey,
  getApiKeys,
  deleteApiKey,
  validateApiKey,
  logUsage,
  logResponse,
  incrementApiKeyStats,
  getUsageLogs,
  getAggregatedUsage,
  getUsageSummary,
  getApiKeyStats
};
