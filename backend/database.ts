import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import config from './config';

const DB_PATH = path.join(__dirname, '../', config.databasePath);

let db: any = null;
let SQL: any = null;
let initialized = false;

export interface ApiKey {
  id: string;
  name: string;
  key_hash?: string;
  api_key?: string;
  description?: string | null;
  user_id?: string | null;
  created_at?: string;
  is_active?: number;
  last_used_at?: string;
}

export interface UsageLog {
  id: string;
  request_id: string;
  api_key_id: string;
  endpoint: string;
  request_body: string;
  response_body: string;
  status_code: number;
  request_tokens: number;
  response_tokens: number;
  latency_ms: number;
  timestamp: string;
  api_key_name?: string;
}

export interface AggregatedUsage {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_latency_ms: number;
}

export interface UsageSummary {
  active_keys: number;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface ApiKeyStats {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_latency_ms: number;
}

export interface TrendsDataPoint {
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
}

export interface LifetimeMetrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  request_count: number;
}

export interface RangeMetrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  request_count: number;
  duration_seconds: number;
}

export interface ProgressiveDataPoint {
  timestamp: string;
  value: number;
}

export interface Granularity {
  startDate: string;
  endDate: string;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export async function init(): Promise<void> {
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

export function isReady(): boolean {
  return initialized;
}

function createSchema(): void {
  db!.run(`
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

  db!.run(`
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

  db!.run(`CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_keys(key_hash)`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_api_key_id ON usage_logs(api_key_id)`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp)`);
}

function saveDatabase(): void {
  const data = db!.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function createApiKey({ id, name, key_hash, description, user_id }: {
  id: string;
  name: string;
  key_hash: string;
  description?: string | null;
  user_id?: string | null;
}): void {
  db!.run(
    'INSERT INTO api_keys (id, name, key_hash, description, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, key_hash, description || null, user_id || null, new Date().toISOString()]
  );
  saveDatabase();
}

export function getApiKeys(): Array<{
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
}> {
  const result = db!.exec('SELECT id, name, description, created_at, user_id FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC');
  if (result.length === 0) return [];
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function deleteApiKey(id: string): boolean {
  db!.run('UPDATE api_keys SET is_active = 0 WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

export function validateApiKey(keyHash: string): {
  id: string;
  name: string;
  created_at: string;
  is_active: number;
  last_used_at: string | null;
} | null {
  const result = db!.exec(
    'SELECT id, name, created_at, is_active, last_used_at FROM api_keys WHERE key_hash = ? AND is_active = 1',
    [keyHash]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = result[0].values[0] as (string | number | null)[];
  const columns = result[0].columns as string[];
  
  const keyData: any = {};
  columns.forEach((col, i) => {
    keyData[col] = row[i];
  });
  
  return keyData;
}

export function logUsage({ request_id, api_key_id, endpoint, request_body, timestamp }: {
  request_id: string;
  api_key_id: string;
  endpoint: string;
  request_body: any;
  timestamp: string;
}): void {
  db!.run(
    'INSERT INTO usage_logs (id, request_id, api_key_id, endpoint, request_body, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [request_id, request_id, api_key_id, endpoint, JSON.stringify(request_body), timestamp]
  );
  saveDatabase();
}

export function logResponse({ request_id, response_body, status_code, response_time_ms }: {
  request_id: string;
  response_body: any;
  status_code: number;
  response_time_ms: number;
}): void {
  db!.run(
    'UPDATE usage_logs SET response_body = ?, status_code = ?, latency_ms = ? WHERE request_id = ?',
    [JSON.stringify(response_body), status_code, response_time_ms, request_id]
  );
  saveDatabase();
}

export function incrementApiKeyStats(apiKeyId: string): void {
  db!.run(
    'UPDATE api_keys SET last_used_at = ? WHERE id = ?',
    [new Date().toISOString(), apiKeyId]
  );
  saveDatabase();
}

export function getUsageLogs({ limit = 100, offset = 0 }: {
  limit?: number;
  offset?: number;
}): UsageLog[] {
  const result = db!.exec(
    `SELECT ul.*, ak.name as api_key_name 
     FROM usage_logs ul 
     JOIN api_keys ak ON ul.api_key_id = ak.id 
     ORDER BY ul.timestamp DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function getAggregatedUsage(period: string = '7d'): AggregatedUsage {
  const days = parseInt(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const result = db!.exec(`
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
  
  const row = result[0].values[0] as (string | number | null)[];
  const totalRequests: number = Number(row[0] || 0);
  const totalInputTokens: number = Number(row[1] || 0);
  const totalOutputTokens: number = Number(row[2] || 0);
  const avgLatency: string | number = row[3] || 0;
  return {
    total_requests: totalRequests,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    avg_latency_ms: typeof avgLatency === 'string' ? parseFloat(avgLatency) : avgLatency
  };
}

export function getUsageSummary(): UsageSummary {
  const result = db!.exec(`
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
  
  const row = result[0].values[0] as (string | number | null)[];
  return {
    active_keys: Number(row[0] || 0),
    total_requests: Number(row[1] || 0),
    total_input_tokens: Number(row[2] || 0),
    total_output_tokens: Number(row[3] || 0)
  };
}

export function getApiKeyStats(apiKeyId: string): ApiKeyStats | null {
  const result = db!.exec(`
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
  const row3 = row[3];
  return {
    total_requests: typeof row[0] === 'number' ? row[0] : 0,
    total_input_tokens: typeof row[1] === 'number' ? row[1] : 0,
    total_output_tokens: typeof row[2] === 'number' ? row[2] : 0,
    avg_latency_ms: row3 && typeof row3 === 'number' ? parseFloat(row3.toFixed(2)) : 0
  };
}

export function getUsageTrends(startDate: string, endDate: string): TrendsDataPoint[] {
  const result = db!.exec(`
    SELECT 
      DATE(timestamp) as date,
      COUNT(*) as requests,
      SUM(request_tokens) as input_tokens,
      SUM(response_tokens) as output_tokens
    FROM usage_logs 
    WHERE timestamp >= ? AND timestamp <= ?
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `, [startDate, endDate]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      date: obj.date,
      requests: typeof obj.requests === 'number' ? obj.requests : 0,
      input_tokens: typeof obj.input_tokens === 'number' ? obj.input_tokens : 0,
      output_tokens: typeof obj.output_tokens === 'number' ? obj.output_tokens : 0
    };
  });
}

export function getLifetimeMetrics(): LifetimeMetrics {
  const result = db!.exec(`
    SELECT 
      COUNT(*) as request_count,
      SUM(request_tokens) as total_input_tokens,
      SUM(response_tokens) as total_output_tokens,
      MIN(timestamp) as first_request,
      MAX(timestamp) as last_request
    FROM usage_logs
  `);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return {
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      tokens_per_sec: 0,
      request_count: 0
    };
  }
  
  const row = result[0].values[0] as (string | number | null)[];
  const requestCount: number = Number(row[0] || 0);
  const totalInputTokens: number = Number(row[1] || 0);
  const totalOutputTokens: number = Number(row[2] || 0);
  const firstRequest: string | null = row[3]?.toString() || null;
  const lastRequest: string | null = row[4]?.toString() || null;
  
  let tokensPerSec = 0;
  if (firstRequest && lastRequest) {
    const firstDate = new Date(firstRequest);
    const lastDate = new Date(lastRequest);
    const durationSecs = (lastDate.getTime() - firstDate.getTime()) / 1000;
    if (durationSecs > 0) {
      tokensPerSec = (totalInputTokens + totalOutputTokens) / durationSecs;
    }
  }
  
  return {
    total_tokens: totalInputTokens + totalOutputTokens,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    tokens_per_sec: Math.round(tokensPerSec * 100) / 100,
    request_count: requestCount
  };
}

export function getRangeMetrics(startDate: string, endDate: string): RangeMetrics {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationSeconds = (end.getTime() - start.getTime()) / 1000 + 1;
  
  const result = db!.exec(`
    SELECT 
      COUNT(*) as request_count,
      SUM(request_tokens) as total_input_tokens,
      SUM(response_tokens) as total_output_tokens
    FROM usage_logs 
    WHERE timestamp >= ? AND timestamp <= ?
  `, [startDate, endDate]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return {
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      tokens_per_sec: 0,
      request_count: 0,
      duration_seconds: durationSeconds
    };
  }
  
  const row = result[0].values[0] as (string | number | null)[];
  const requestCount: number = Number(row[0] || 0);
  const totalInputTokens: number = Number(row[1] || 0);
  const totalOutputTokens: number = Number(row[2] || 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  
  const tokensPerSec = durationSeconds > 0 ? totalTokens / durationSeconds : 0;
  
  return {
    total_tokens: totalTokens,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    tokens_per_sec: Math.round(tokensPerSec * 100) / 100,
    request_count: requestCount,
    duration_seconds: durationSeconds
  };
}

export function getProgressiveData(
  startDate: string, 
  endDate: string, 
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly',
  metric: 'total_tokens' | 'input_tokens' | 'output_tokens' | 'requests' | 'tokens_per_sec'
): Promise<ProgressiveDataPoint[]> {
  return new Promise((resolve) => {
    let groupByClause: string;
    switch (granularity) {
      case 'hourly':
        groupByClause = 'strftime("%Y-%m-%d %H:00:00", timestamp)';
        break;
      case 'daily':
        groupByClause = 'DATE(timestamp)';
        break;
      case 'weekly':
        groupByClause = 'strftime("%Y-%W", timestamp)';
        break;
      case 'monthly':
        groupByClause = 'strftime("%Y-%m", timestamp)';
        break;
    }
    
    let selectClause: string;
    switch (metric) {
      case 'total_tokens':
        selectClause = 'SUM(request_tokens + response_tokens) as value';
        break;
      case 'input_tokens':
        selectClause = 'SUM(request_tokens) as value';
        break;
      case 'output_tokens':
        selectClause = 'SUM(response_tokens) as value';
        break;
      case 'requests':
        selectClause = 'COUNT(*) as value';
        break;
      case 'tokens_per_sec':
        selectClause = `
          ROUND(
            SUM(request_tokens + response_tokens) * 1.0 / 
            MAX(strftime("%s", timestamp)) - MIN(strftime("%s", timestamp)) + 1,
            2
          ) as value
        `;
        break;
    }
    
    const query = `
      SELECT ${groupByClause} as timestamp, ${selectClause}
      FROM usage_logs 
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY ${groupByClause}
      ORDER BY timestamp ASC
    `;
    
    const result = db!.exec(query, [startDate, endDate]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      resolve([]);
      return;
    }
    
    const columns = result[0].columns as string[];
    const values = result[0].values as (string | number | null)[][];
    
    const dataPoints: ProgressiveDataPoint[] = values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return {
        timestamp: obj.timestamp,
        value: typeof obj.value === 'number' ? obj.value : 0
      };
    });
    
    resolve(dataPoints);
  });
}

export default {
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
  getApiKeyStats,
  getUsageTrends,
  getLifetimeMetrics,
  getRangeMetrics,
  getProgressiveData
};
