import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import config from './config';
import type { MetricType, GranularitySeconds } from './types/metrics';
import { roundToGranularity } from './utils/granularity';

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
  input_tokens_per_sec: number;
  output_tokens_per_sec: number;
  request_count: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

export interface RangeMetrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  input_tokens_per_sec: number;
  output_tokens_per_sec: number;
  request_count: number;
  duration_seconds: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

export interface ProgressiveDataPoint {
  timestamp: string;
  value: number | null;
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

export function getDb(): any {
  return db;
}

export function close(): void {
  if (db) {
    db.close();
  }
  initialized = false;
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
      revoked_at TEXT,
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
      idempotency_key TEXT,
      cache_creation_input_tokens INTEGER DEFAULT 0,
      cache_read_input_tokens INTEGER DEFAULT 0,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
    )
  `);

  db!.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db!.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))`);
  db!.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
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
    'INSERT INTO api_keys (id, name, key_hash, description, user_id, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, key_hash, description || null, user_id || null, new Date().toISOString(), 1]
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

export function getApiKeyById(id: string): {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
  is_active: number;
  revoked_at: string | null;
} | null {
  const result = db!.exec('SELECT id, name, description, created_at, user_id, is_active, revoked_at FROM api_keys WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  const row = values[0];
  
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  
  return obj;
}

export function getApiKeysByUserId(userId: string, showRevoked = false): Array<{
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
  is_active: number;
  revoked_at: string | null;
}> {
  const whereClause = showRevoked 
    ? 'user_id = ?' 
    : 'is_active = 1 AND user_id = ?';
  const params = showRevoked ? [userId] : [1, userId];
  
  const result = db!.exec(`SELECT id, name, description, created_at, user_id, is_active, revoked_at FROM api_keys WHERE ${whereClause} ORDER BY created_at DESC`, params);
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

export function checkApiKeyHasMetrics(apiKeyId: string): boolean {
  const result = db!.exec(
    'SELECT 1 FROM usage_logs WHERE api_key_id = ? LIMIT 1',
    [apiKeyId]
  );
  return result.length > 0 && result[0].values.length > 0;
}

export function deleteApiKey(id: string): boolean {
  db!.run('UPDATE api_keys SET is_active = 0, revoked_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  saveDatabase();
  return true;
}

export function permanentlyDeleteApiKey(id: string): void {
  db!.run('DELETE FROM api_keys WHERE id = ?', [id]);
  saveDatabase();
}

export function findUserByEmail(email: string): User | null {
  const result = db!.exec('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE LOWER(email) = LOWER(?)', [email]);
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
  const normalizedEmail = email.toLowerCase().trim();
  db!.run(
    'INSERT INTO users (id, email, name, oauth_id, oauth_provider, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, normalizedEmail, name, oauth_id || null, oauth_provider || null, new Date().toISOString()]
  );
  saveDatabase();
  
  return { id, email: normalizedEmail, name, oauth_id, oauth_provider, created_at: new Date().toISOString() };
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

export function getAllUsers(): Array<{
  id: string;
  email: string;
  name: string;
}> {
  const result = db!.exec('SELECT id, email, name FROM users ORDER BY name ASC');
  if (result.length === 0) return [];
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id,
      email: obj.email,
      name: obj.name || obj.email,
    };
  });
}

export function getApiKeysByUserIdFilter(userId: string, showRevoked = false): Array<{
  id: string;
  name: string;
  is_active: number;
  revoked_at: string | null;
}> {
  let query: string;
  let params: (string | number)[] = [userId];
  
  if (showRevoked) {
    // Return all keys for the user
    query = 'SELECT id, name, is_active, revoked_at FROM api_keys WHERE user_id = ? ORDER BY name ASC';
  } else {
    // Return only active keys
    query = 'SELECT id, name, is_active, revoked_at FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY name ASC';
    params = [userId];
  }
  
  const result = db!.exec(query, params);
  if (result.length === 0) return [];
  
  const columns = result[0].columns as string[];
  const values = result[0].values as (string | number | null)[][];
  
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id,
      name: obj.name,
      is_active: obj.is_active,
      revoked_at: obj.revoked_at,
    };
  });
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

export function getLifetimeMetrics(userId?: string, apiKeyId?: string): LifetimeMetrics {
  let query = `
    SELECT 
      COUNT(*) as request_count,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      SUM(cache_creation_input_tokens) as cache_creation_tokens,
      SUM(cache_read_input_tokens) as cache_read_tokens,
      MIN(timestamp) as first_request,
      MAX(timestamp) as last_request
    FROM usage_logs
  `;
  
  const params: (string | number)[] = [];
  
  if (userId) {
    query += ` JOIN api_keys ON usage_logs.api_key_id = api_keys.id`;
  }
  
  if (userId && apiKeyId) {
    query += ` WHERE api_keys.user_id = ? AND api_keys.id = ?`;
    params.push(userId, apiKeyId);
  } else if (userId) {
    query += ` WHERE api_keys.user_id = ?`;
    params.push(userId);
  }
  
  const result = db!.exec(query, params);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return {
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      tokens_per_sec: 0,
      input_tokens_per_sec: 0,
      output_tokens_per_sec: 0,
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
  
  // Calculate tokens_per_sec using actual duration from usage logs (hardware throughput)
  const durationResult = db!.exec(`
    SELECT SUM(duration_ms) as total_duration_ms
    FROM usage_logs
    ${userId ? 'JOIN api_keys ON usage_logs.api_key_id = api_keys.id' : ''}
    ${userId && apiKeyId ? 'WHERE api_keys.user_id = ? AND api_keys.id = ?' : ''}
    ${userId && !apiKeyId ? 'WHERE api_keys.user_id = ?' : ''}
  `, params);
  
  const totalDurationMs = durationResult.length > 0 && durationResult[0].values.length > 0 
    ? Number(durationResult[0].values[0][0] || 0) 
    : 0;
  
  let tokensPerSec = 0;
  let inputTokensPerSec = 0;
  let outputTokensPerSec = 0;
  if (totalDurationMs > 0) {
    tokensPerSec = (totalInputTokens + totalOutputTokens) * 1000 / totalDurationMs;
    inputTokensPerSec = totalInputTokens * 1000 / totalDurationMs;
    outputTokensPerSec = totalOutputTokens * 1000 / totalDurationMs;
  }
  
  return {
    total_tokens: totalInputTokens + totalOutputTokens,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    tokens_per_sec: Math.round(tokensPerSec * 100) / 100,
    input_tokens_per_sec: Math.round(inputTokensPerSec * 100) / 100,
    output_tokens_per_sec: Math.round(outputTokensPerSec * 100) / 100,
    request_count: requestCount,
    cache_creation_tokens: Number(row[3] || 0),
    cache_read_tokens: Number(row[4] || 0)
  };
}

export function getRangeMetrics(startDate: string, endDate: string, userId?: string, apiKeyId?: string): RangeMetrics {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationSeconds = (end.getTime() - start.getTime()) / 1000 + 1;
  
  let query = `
    SELECT 
      COUNT(*) as request_count,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      SUM(cache_creation_input_tokens) as cache_creation_tokens,
      SUM(cache_read_input_tokens) as cache_read_tokens
    FROM usage_logs
  `;
  
  const params: (string | number)[] = [];
  
  if (userId) {
    query += ` JOIN api_keys ON usage_logs.api_key_id = api_keys.id`;
  }
  
  query += ` WHERE timestamp >= ? AND timestamp <= ?`;
  params.push(startDate, endDate);
  
  if (userId && apiKeyId) {
    query += ` AND api_keys.user_id = ? AND api_keys.id = ?`;
    params.push(userId, apiKeyId);
  } else if (userId) {
    query += ` AND api_keys.user_id = ?`;
    params.push(userId);
  }
  
  const result = db!.exec(query, params);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return {
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      tokens_per_sec: 0,
      input_tokens_per_sec: 0,
      output_tokens_per_sec: 0,
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
  
  // Calculate tokens_per_sec using actual duration from usage logs (hardware throughput)
  const durationQuery = `
    SELECT SUM(duration_ms) as total_duration_ms
    FROM usage_logs
    ${userId ? 'JOIN api_keys ON usage_logs.api_key_id = api_keys.id' : ''}
    WHERE timestamp >= ? AND timestamp <= ?
    ${userId && apiKeyId ? 'AND api_keys.user_id = ? AND api_keys.id = ?' : ''}
    ${userId && !apiKeyId ? 'AND api_keys.user_id = ?' : ''}
  `;
  
  const durationParams: (string | number)[] = [startDate, endDate];
  if (userId && apiKeyId) {
    durationParams.push(userId, apiKeyId);
  } else if (userId) {
    durationParams.push(userId);
  }
  
  const durationResult = db!.exec(durationQuery, durationParams);
  
  const totalDurationMs = durationResult.length > 0 && durationResult[0].values.length > 0 
    ? Number(durationResult[0].values[0][0] || 0) 
    : 0;
  
  const tokensPerSec = totalDurationMs > 0 ? (totalTokens * 1000) / totalDurationMs : 0;
  const inputTokensPerSec = totalDurationMs > 0 ? (totalInputTokens * 1000) / totalDurationMs : 0;
  const outputTokensPerSec = totalDurationMs > 0 ? (totalOutputTokens * 1000) / totalDurationMs : 0;
  
  return {
    total_tokens: totalTokens,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    tokens_per_sec: Math.round(tokensPerSec * 100) / 100,
    input_tokens_per_sec: Math.round(inputTokensPerSec * 100) / 100,
    output_tokens_per_sec: Math.round(outputTokensPerSec * 100) / 100,
    request_count: requestCount,
    duration_seconds: durationSeconds,
    cache_creation_tokens: Number(row[3] || 0),
    cache_read_tokens: Number(row[4] || 0)
  };
}

export function getProgressiveData(
  startDate: string, 
  endDate: string, 
  granularity: GranularitySeconds,
  metric: MetricType,
  userId?: string,
  apiKeyId?: string
): Promise<ProgressiveDataPoint[]> {
  return getProgressiveDataWithInterpolation(startDate, endDate, granularity, metric, 0, 16, userId, apiKeyId);
}

export function getProgressiveDataWithInterpolation(
  startDate: string, 
  endDate: string, 
  granularitySeconds: GranularitySeconds,
  metric: MetricType,
  batchIndex: number = 0,
  batchSize: number = 16,
  userId?: string,
  apiKeyId?: string
): Promise<ProgressiveDataPoint[]> {
  return new Promise((resolve) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Round start down to granularity boundary
    const roundedStart = roundToGranularity(start, granularitySeconds);
    // Round end down to granularity boundary and add one full bucket for inclusive range
    const roundedEnd = roundToGranularity(end, granularitySeconds);
    const inclusiveEnd = new Date(roundedEnd.getTime() + granularitySeconds * 1000);
    
    const roundedStartNum = roundedStart.getTime();
    const inclusiveEndNum = inclusiveEnd.getTime();
    const totalRangeSeconds = Math.max(1, (inclusiveEndNum - roundedStartNum) / 1000);
    const totalBuckets = Math.ceil(totalRangeSeconds / granularitySeconds);
    
    const bucketStartIndex = batchIndex * batchSize;
    const bucketEndIndex = Math.min(bucketStartIndex + batchSize, totalBuckets);
    
    // Build SQL SELECT clause based on metric
    const getMetricSelect = (metric: string): string => {
      switch (metric) {
        case 'total_tokens':
          return 'COALESCE(SUM(COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)), 0)';
        case 'input_tokens':
          return 'COALESCE(SUM(COALESCE(prompt_tokens, 0)), 0)';
        case 'output_tokens':
          return 'COALESCE(SUM(COALESCE(completion_tokens, 0)), 0)';
        case 'requests':
          return 'COUNT(*)';
        case 'tokens_per_sec':
          return `CASE WHEN COUNT(*) = 0 THEN NULL ELSE COALESCE(CASE WHEN SUM(duration_ms) > 0 THEN ROUND(SUM(prompt_tokens + completion_tokens) * 1000.0 / SUM(duration_ms), 2) ELSE NULL END, 0) END`;
        case 'input_tokens_per_sec':
          return `CASE WHEN COUNT(*) = 0 THEN NULL ELSE COALESCE(CASE WHEN SUM(duration_ms) > 0 THEN ROUND(SUM(prompt_tokens) * 1000.0 / SUM(duration_ms), 2) ELSE NULL END, 0) END`;
        case 'output_tokens_per_sec':
          return `CASE WHEN COUNT(*) = 0 THEN NULL ELSE COALESCE(CASE WHEN SUM(duration_ms) > 0 THEN ROUND(SUM(completion_tokens) * 1000.0 / SUM(duration_ms), 2) ELSE NULL END, 0) END`;
        default:
          return 'COALESCE(SUM(prompt_tokens + completion_tokens), 0)';
      }
    };
    
    const selectExpr = getMetricSelect(metric);
    
    // Generate all bucket timestamps in JavaScript
    const buckets: { start: Date; end: Date }[] = [];
    for (let t = roundedStartNum; t < inclusiveEndNum; t += granularitySeconds * 1000) {
      buckets.push({
        start: new Date(t),
        end: new Date(t + granularitySeconds * 1000)
      });
    }
    
    // Query each bucket individually (one query per bucket for simplicity)
    const dataPoints: ProgressiveDataPoint[] = [];
    
    // Build JOIN and WHERE clause for user/apiKey filtering
    let joinClause = '';
    
    for (let i = bucketStartIndex; i < bucketEndIndex; i++) {
      const bucket = buckets[i];
      
        // Query for single bucket range with optional user filtering
      let query = `
        SELECT ${selectExpr} as value
        FROM usage_logs
      `;
      
      let queryParams: (string | number)[] = [];
      let whereClause = ' WHERE timestamp >= ? AND timestamp < ?';
      let joinClause = '';
      
      queryParams.push(bucket.start.toISOString(), bucket.end.toISOString());
      
      if (apiKeyId) {
        // Filter by specific API key (ignore userId)
        joinClause = ' JOIN api_keys ON usage_logs.api_key_id = api_keys.id';
        whereClause += ' AND api_keys.id = ?';
        queryParams.push(apiKeyId);
      } else if (userId) {
        // Filter by user's all API keys
        joinClause = ' JOIN api_keys ON usage_logs.api_key_id = api_keys.id';
        whereClause += ' AND api_keys.user_id = ?';
        queryParams.push(userId);
      }
      
      query += joinClause;
      query += whereClause;
      const result = db!.exec(query, queryParams);
      
       let value: number | null = null;
      if (result.length > 0 && result[0].values.length > 0) {
        const rawValue = result[0].values[0][0];
        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          value = Number(rawValue);
        }
      }
      
      dataPoints.push({
        timestamp: bucket.start.toISOString(),
        value
      });
    }
    
    resolve(dataPoints);
  });
}

export function getTimestampTemplate(
  startDate: string, 
  endDate: string, 
  granularitySeconds: GranularitySeconds,
  userId?: string,
  apiKeyId?: string
): Promise<ProgressiveDataPoint[]> {
  return new Promise((resolve) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const roundedStart = roundToGranularity(start, granularitySeconds);
    const roundedEnd = roundToGranularity(end, granularitySeconds);
    const inclusiveEnd = new Date(roundedEnd.getTime() + granularitySeconds * 1000);
    
    const roundedStartNum = roundedStart.getTime();
    const inclusiveEndNum = inclusiveEnd.getTime();
    const totalRangeSeconds = Math.max(1, (inclusiveEndNum - roundedStartNum) / 1000);
    const totalBuckets = Math.ceil(totalRangeSeconds / granularitySeconds);
    
    const dataPoints: ProgressiveDataPoint[] = [];
    
    for (let t = roundedStartNum; t < inclusiveEndNum; t += granularitySeconds * 1000) {
      dataPoints.push({
        timestamp: new Date(t).toISOString(),
        value: null
      });
    }
    
    resolve(dataPoints);
  });
}

export async function clearDatabase(): Promise<void> {
  try {
    db!.run('DELETE FROM usage_logs');
    db!.run('DELETE FROM users');
    db!.run('DELETE FROM api_keys');
    saveDatabase();
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}

export default {
  init,
  isReady,
  createApiKey,
  getApiKeys,
  getApiKeysByUserId,
  deleteApiKey,
  permanentlyDeleteApiKey,
  checkApiKeyHasMetrics,
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
  getAllUsers,
  getApiKeysByUserIdFilter,
  getDb,
  clearDatabase,
  close
};
