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

export interface User {
  id: string;
  email: string;
  name: string;
  oauth_id: string | null;
  oauth_provider: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  request_id: string;
  api_key_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  timestamp: string;
  api_key_name?: string;
  idempotency_key?: string | null;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
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
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

export interface RangeMetrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  request_count: number;
  duration_seconds: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
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
    await migrateSchema();
  } else {
    db = new SQL.Database();
    createSchema();
    saveDatabase();
  }

  console.log('Database initialized');
  initialized = true;
}

async function migrateSchema(): Promise<void> {
  try {
    const columns = db.exec("PRAGMA table_info(usage_logs)");
    const columnNames = columns[0]?.values.map((row: any[]) => row[1]) || [];
    
    if (!columnNames.includes('idempotency_key')) {
      console.log('Migrating: Adding idempotency_key column');
      db.run('ALTER TABLE usage_logs ADD COLUMN idempotency_key TEXT');
    }
    
    if (!columnNames.includes('cache_creation_input_tokens')) {
      console.log('Migrating: Adding cache_creation_input_tokens column');
      db.run('ALTER TABLE usage_logs ADD COLUMN cache_creation_input_tokens INTEGER DEFAULT 0');
    }
    
    if (!columnNames.includes('cache_read_input_tokens')) {
      console.log('Migrating: Adding cache_read_input_tokens column');
      db.run('ALTER TABLE usage_logs ADD COLUMN cache_read_input_tokens INTEGER DEFAULT 0');
    }
    
    saveDatabase();
    console.log('Database migration completed');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

export function isReady(): boolean {
  return initialized;
}

export function getDb(): any {
  return db;
}

function createSchema(): void {
  db!.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      oauth_id TEXT,
      oauth_provider TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

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
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
    )
  `);

  db!.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_keys(key_hash)`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_api_key_id ON usage_logs(api_key_id)`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp)`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage_logs(api_key_id)`);
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

export function getApiKeysByUserId(userId: string): Array<{
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
}> {
  const result = db!.exec('SELECT id, name, description, created_at, user_id FROM api_keys WHERE is_active = 1 AND user_id = ? ORDER BY created_at DESC', [userId]);
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

export function findUserByEmail(email: string): User | null {
  const result = db!.exec('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE email = ?', [email]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  const row = values[0];
  
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  
  return {
    id: obj.id,
    email: obj.email,
    name: obj.name || '',
    oauth_id: obj.oauth_id,
    oauth_provider: obj.oauth_provider,
    created_at: obj.created_at,
  };
}

export function createUser({ id, email, name, oauth_id, oauth_provider }: {
  id: string;
  email: string;
  name: string;
  oauth_id: string | null;
  oauth_provider: string | null;
}): User {
  db!.run(
    'INSERT INTO users (id, email, name, oauth_id, oauth_provider, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, email, name, oauth_id || null, oauth_provider || null, new Date().toISOString()]
  );
  saveDatabase();
  
  return { id, email, name, oauth_id, oauth_provider, created_at: new Date().toISOString() };
}

export function updateUserOauth(id: string, oauth_id: string, oauth_provider: string): void {
  db!.run('UPDATE users SET oauth_id = ?, oauth_provider = ? WHERE id = ?', [oauth_id, oauth_provider, id]);
  saveDatabase();
}

export function findUserByOauthId(oauth_id: string): User | null {
  const result = db!.exec('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE oauth_id = ?', [oauth_id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  const row = values[0];
  
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  
  return {
    id: obj.id,
    email: obj.email,
    name: obj.name || '',
    oauth_id: obj.oauth_id,
    oauth_provider: obj.oauth_provider,
    created_at: obj.created_at,
  };
}

export function findUserById(id: string): User | null {
  const result = db!.exec('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  const row = values[0];
  
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  
  return {
    id: obj.id,
    email: obj.email,
    name: obj.name || '',
    oauth_id: obj.oauth_id,
    oauth_provider: obj.oauth_provider,
    created_at: obj.created_at,
  };
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

export function logUsage({ 
  request_id, 
  api_key_id, 
  prompt_tokens, 
  completion_tokens, 
  total_tokens, 
  duration_ms, 
  timestamp,
  idempotency_key = null,
  cache_creation_input_tokens = 0,
  cache_read_input_tokens = 0
}: {
  request_id: string;
  api_key_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  timestamp: string;
  idempotency_key?: string | null;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}): void {
  // Check if record exists
  const exists = db!.exec('SELECT 1 FROM usage_logs WHERE request_id = ?', [request_id]);
  
  if (exists.length > 0 && exists[0].values.length > 0) {
    // Update existing record
    db!.run(
      'UPDATE usage_logs SET prompt_tokens = ?, completion_tokens = ?, total_tokens = ?, duration_ms = ?, timestamp = ?, idempotency_key = ?, cache_creation_input_tokens = ?, cache_read_input_tokens = ? WHERE request_id = ?',
      [prompt_tokens, completion_tokens, total_tokens, duration_ms, timestamp, idempotency_key || null, cache_creation_input_tokens, cache_read_input_tokens, request_id]
    );
  } else {
    // Insert new record
    db!.run(
      'INSERT INTO usage_logs (id, request_id, api_key_id, prompt_tokens, completion_tokens, total_tokens, duration_ms, timestamp, idempotency_key, cache_creation_input_tokens, cache_read_input_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [request_id, request_id, api_key_id, prompt_tokens, completion_tokens, total_tokens, duration_ms, timestamp, idempotency_key || null, cache_creation_input_tokens, cache_read_input_tokens]
    );
  }
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
    `SELECT ul.id, ul.request_id, ul.api_key_id, ul.prompt_tokens, ul.completion_tokens, ul.total_tokens, ul.duration_ms, ul.timestamp, ak.name as api_key_name, ul.idempotency_key, ul.cache_creation_input_tokens, ul.cache_read_input_tokens
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
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      AVG(duration_ms) as avg_latency_ms
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
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens
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
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      AVG(duration_ms) as avg_latency_ms
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
      SUM(prompt_tokens) as input_tokens,
      SUM(completion_tokens) as output_tokens
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
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      SUM(cache_creation_input_tokens) as cache_creation_tokens,
      SUM(cache_read_input_tokens) as cache_read_tokens,
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
      request_count: 0,
      cache_creation_tokens: 0,
      cache_read_tokens: 0
    };
  }
  
  const row = result[0].values[0] as (string | number | null)[];
  const requestCount: number = Number(row[0] || 0);
  const totalInputTokens: number = Number(row[1] || 0);
  const totalOutputTokens: number = Number(row[2] || 0);
  const firstRequest: string | null = row[5]?.toString() || null;
  const lastRequest: string | null = row[6]?.toString() || null;
  
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
    request_count: requestCount,
    cache_creation_tokens: Number(row[3] || 0),
    cache_read_tokens: Number(row[4] || 0)
  };
}

export function getRangeMetrics(startDate: string, endDate: string): RangeMetrics {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationSeconds = (end.getTime() - start.getTime()) / 1000 + 1;
  
  const result = db!.exec(`
    SELECT 
      COUNT(*) as request_count,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      SUM(cache_creation_input_tokens) as cache_creation_tokens,
      SUM(cache_read_input_tokens) as cache_read_tokens
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
      duration_seconds: durationSeconds,
      cache_creation_tokens: 0,
      cache_read_tokens: 0
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
    duration_seconds: durationSeconds,
    cache_creation_tokens: Number(row[3] || 0),
    cache_read_tokens: Number(row[4] || 0)
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
        selectClause = 'SUM(prompt_tokens + completion_tokens) as value';
        break;
      case 'input_tokens':
        selectClause = 'SUM(prompt_tokens) as value';
        break;
      case 'output_tokens':
        selectClause = 'SUM(completion_tokens) as value';
        break;
      case 'requests':
        selectClause = 'COUNT(*) as value';
        break;
      case 'tokens_per_sec':
        selectClause = `
          ROUND(
            SUM(prompt_tokens + completion_tokens) * 1.0 / 
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
  getApiKeysByUserId,
  deleteApiKey,
  validateApiKey,
  logUsage,
  incrementApiKeyStats,
  getUsageLogs,
  getAggregatedUsage,
  getUsageSummary,
  getApiKeyStats,
  getUsageTrends,
  getLifetimeMetrics,
  getRangeMetrics,
  getProgressiveData,
  findUserByEmail,
  createUser,
  updateUserOauth,
  findUserByOauthId,
  findUserById,
  getDb
};
