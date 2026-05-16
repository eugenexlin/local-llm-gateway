import Database from 'better-sqlite3';
import path from 'path';
import config from './config';
import type { MetricType, GranularitySeconds } from './types/metrics';
import { roundToGranularity } from './utils/granularity';

const DB_PATH = path.join(__dirname, '../', config.databasePath);

let db: Database.Database | null = null;
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
  id: number;
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
  ttft_ms?: number | null;
  stream_duration_ms?: number | null;
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
  hasValue: boolean;
}

export interface Granularity {
  startDate: string;
  endDate: string;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export function init(): void {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  createSchema();

  console.log('Database initialized');
  initialized = true;
}

export function isReady(): boolean {
  return initialized;
}

export function getDb(): Database.Database | null {
  return db;
}

export function close(): void {
  if (db) {
    db.close();
  }
  db = null;
  initialized = false;
}

function createSchema(): void {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      oauth_id TEXT,
      oauth_provider TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db!.exec(`
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

  db!.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  // Migrate: add timing columns if they don't exist (safe, no data loss)
  try { db!.exec(`ALTER TABLE usage_logs ADD COLUMN ttft_ms INTEGER DEFAULT NULL`); } catch {}
  try { db!.exec(`ALTER TABLE usage_logs ADD COLUMN stream_duration_ms INTEGER DEFAULT NULL`); } catch {}

  db!.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db!.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))`);
  db!.exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
  db!.exec(`CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_keys(key_hash)`);
  db!.exec(`CREATE INDEX IF NOT EXISTS idx_api_key_id ON usage_logs(api_key_id)`);
  db!.exec(`CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp)`);
  db!.exec(`CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage_logs(api_key_id)`);
}

export function createApiKey({ id, name, key_hash, description, user_id }: {
  id: string;
  name: string;
  key_hash: string;
  description?: string | null;
  user_id?: string | null;
}): void {
  db!.prepare(
    'INSERT INTO api_keys (id, name, key_hash, description, user_id, created_at, is_active) VALUES (:id, :name, :key_hash, :description, :user_id, :created_at, 1)'
  ).run({
    id,
    name,
    key_hash,
    description: description || null,
    user_id: user_id || null,
    created_at: new Date().toISOString(),
  });
}

export function getApiKeys(): Array<{
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
}> {
  return db!.prepare('SELECT id, name, description, created_at, user_id FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC').all() as any;
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
  return db!.prepare('SELECT id, name, description, created_at, user_id, is_active, revoked_at FROM api_keys WHERE id = ?').get(id) as any;
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
  
  return db!.prepare(`SELECT id, name, description, created_at, user_id, is_active, revoked_at FROM api_keys WHERE ${whereClause} ORDER BY created_at DESC`).all(params) as any;
}

export function checkApiKeyHasMetrics(apiKeyId: string): boolean {
  const result = db!.prepare(
    'SELECT 1 FROM usage_logs WHERE api_key_id = ? LIMIT 1'
  ).get(apiKeyId);
  return result !== undefined;
}

export function deleteApiKey(id: string): boolean {
  db!.prepare('UPDATE api_keys SET is_active = 0, revoked_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  return true;
}

export function permanentlyDeleteApiKey(id: string): void {
  db!.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
}

export function updateApiKeyName(id: string, name: string): void {
  db!.prepare('UPDATE api_keys SET name = ? WHERE id = ?').run(name, id);
}

export function updateApiKeyDescription(id: string, description: string | null): void {
  db!.prepare('UPDATE api_keys SET description = ? WHERE id = ?').run(description, id);
}

export function findUserByEmail(email: string): User | null {
  return db!.prepare('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
}

export function createUser({ id, email, name, oauth_id, oauth_provider }: {
  id: string;
  email: string;
  name: string;
  oauth_id: string | null;
  oauth_provider: string | null;
}): User {
  const normalizedEmail = email.toLowerCase().trim();
  db!.prepare(
    'INSERT INTO users (id, email, name, oauth_id, oauth_provider, created_at) VALUES (:id, :email, :name, :oauth_id, :oauth_provider, :created_at)'
  ).run({
    id,
    email: normalizedEmail,
    name,
    oauth_id: oauth_id || null,
    oauth_provider: oauth_provider || null,
    created_at: new Date().toISOString(),
  });
  
  return { id, email: normalizedEmail, name, oauth_id, oauth_provider, created_at: new Date().toISOString() };
}

export function updateUserOauth(id: string, oauth_id: string, oauth_provider: string): void {
  db!.prepare('UPDATE users SET oauth_id = ?, oauth_provider = ? WHERE id = ?').run(oauth_id, oauth_provider, id);
}

export function findUserByOauthId(oauth_id: string): User | null {
  return db!.prepare('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE oauth_id = ?').get(oauth_id) as any;
}

export function findUserById(id: string): User | null {
  return db!.prepare('SELECT id, email, name, oauth_id, oauth_provider, created_at FROM users WHERE id = ?').get(id) as any;
}

export function getAllUsers(): Array<{
  id: string;
  email: string;
  name: string;
}> {
  const results = db!.prepare('SELECT id, email, name FROM users ORDER BY name ASC').all() as any[];
  return results.map((row: any) => ({
    id: row.id,
    email: row.email,
    name: row.name || row.email,
  }));
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
    query = 'SELECT id, name, is_active, revoked_at FROM api_keys WHERE user_id = ? ORDER BY name ASC';
  } else {
    query = 'SELECT id, name, is_active, revoked_at FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY name ASC';
    params = [userId];
  }
  
  return db!.prepare(query).all(params) as any;
}

export function validateApiKey(keyHash: string): {
  id: string;
  name: string;
  created_at: string;
  is_active: number;
  last_used_at: string | null;
} | null {
  return db!.prepare(
    'SELECT id, name, created_at, is_active, last_used_at FROM api_keys WHERE key_hash = ? AND is_active = 1'
  ).get(keyHash) as any;
}

export function logUsage({ 
  api_key_id, 
  prompt_tokens, 
  completion_tokens, 
  total_tokens, 
  duration_ms, 
  timestamp,
  idempotency_key = null,
  cache_creation_input_tokens = 0,
  cache_read_input_tokens = 0,
  ttft_ms = null,
  stream_duration_ms = null
}: {
  api_key_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  timestamp: string;
  idempotency_key?: string | null;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  ttft_ms?: number | null;
  stream_duration_ms?: number | null;
}): void {
  db!.prepare(
    'INSERT INTO usage_logs (api_key_id, prompt_tokens, completion_tokens, total_tokens, duration_ms, timestamp, idempotency_key, cache_creation_input_tokens, cache_read_input_tokens, ttft_ms, stream_duration_ms) VALUES (:api_key_id, :prompt_tokens, :completion_tokens, :total_tokens, :duration_ms, :timestamp, :idempotency_key, :cache_creation_input_tokens, :cache_read_input_tokens, :ttft_ms, :stream_duration_ms)'
  ).run({
    api_key_id,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    duration_ms,
    timestamp,
    idempotency_key: idempotency_key || null,
    cache_creation_input_tokens,
    cache_read_input_tokens,
    ttft_ms: ttft_ms || null,
    stream_duration_ms: stream_duration_ms || null,
  });
}

export function incrementApiKeyStats(apiKeyId: string): void {
  db!.prepare(
    'UPDATE api_keys SET last_used_at = ? WHERE id = ?'
  ).run(new Date().toISOString(), apiKeyId);
}

export function getUsageLogs({ limit = 100, offset = 0 }: {
  limit?: number;
  offset?: number;
}): UsageLog[] {
  return db!.prepare(
    `SELECT ul.id, ul.api_key_id, ul.prompt_tokens, ul.completion_tokens, ul.total_tokens, ul.duration_ms, ul.timestamp, ak.name as api_key_name, ul.idempotency_key, ul.cache_creation_input_tokens, ul.cache_read_input_tokens, ul.ttft_ms, ul.stream_duration_ms
     FROM usage_logs ul 
     JOIN api_keys ak ON ul.api_key_id = ak.id 
     ORDER BY ul.timestamp DESC 
     LIMIT ? OFFSET ?`
  ).all(limit, offset) as any;
}

export function getAggregatedUsage(period: string = '7d'): AggregatedUsage {
  const days = parseInt(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const row = db!.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      AVG(duration_ms) as avg_latency_ms
    FROM usage_logs 
    WHERE timestamp > ?
  `).get(startDate) as any;
  
  if (!row) {
    return {
      total_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      avg_latency_ms: 0
    };
  }
  
  return {
    total_requests: row.total_requests || 0,
    total_input_tokens: row.total_input_tokens || 0,
    total_output_tokens: row.total_output_tokens || 0,
    avg_latency_ms: typeof row.avg_latency_ms === 'string' ? parseFloat(row.avg_latency_ms) : (row.avg_latency_ms || 0)
  };
}

export function getUsageSummary(): UsageSummary {
  const row = db!.prepare(`
    SELECT 
      COUNT(DISTINCT api_key_id) as active_keys,
      COUNT(*) as total_requests,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens
    FROM usage_logs
  `).get() as any;
  
  if (!row) {
    return {
      active_keys: 0,
      total_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0
    };
  }
  
  return {
    active_keys: row.active_keys || 0,
    total_requests: row.total_requests || 0,
    total_input_tokens: row.total_input_tokens || 0,
    total_output_tokens: row.total_output_tokens || 0
  };
}

export function getApiKeyStats(apiKeyId: string): ApiKeyStats | null {
  const row = db!.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      AVG(duration_ms) as avg_latency_ms
    FROM usage_logs 
    WHERE api_key_id = ?
  `).get(apiKeyId) as any;
  
  if (!row) {
    return null;
  }
  
  return {
    total_requests: row.total_requests || 0,
    total_input_tokens: row.total_input_tokens || 0,
    total_output_tokens: row.total_output_tokens || 0,
    avg_latency_ms: row.avg_latency_ms ? parseFloat((row.avg_latency_ms as number).toFixed(2)) : 0
  };
}

export function getUsageTrends(startDate: string, endDate: string): TrendsDataPoint[] {
  const results = db!.prepare(`
    SELECT 
      DATE(timestamp) as date,
      COUNT(*) as requests,
      SUM(prompt_tokens) as input_tokens,
      SUM(completion_tokens) as output_tokens
    FROM usage_logs 
    WHERE timestamp >= ? AND timestamp <= ?
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `).all(startDate, endDate) as any[];
  
  return results.map((row: any) => ({
    date: row.date,
    requests: row.requests || 0,
    input_tokens: row.input_tokens || 0,
    output_tokens: row.output_tokens || 0
  }));
}

interface _AggregatedMetricsResult {
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalDurationMs: number;
  totalTtftMs: number;
  totalStreamDurationMs: number;
}

function _buildAggregatedMetrics(
  userId?: string | string[],
  apiKeyId?: string,
  dateRange?: [string, string],
): _AggregatedMetricsResult {
  let query = `
    SELECT 
      COUNT(*) as request_count,
      SUM(prompt_tokens) as total_input_tokens,
      SUM(completion_tokens) as total_output_tokens,
      SUM(cache_creation_input_tokens) as cache_creation_tokens,
      SUM(cache_read_input_tokens) as cache_read_tokens,
      SUM(ttft_ms) as total_ttft_ms,
      SUM(stream_duration_ms) as total_stream_duration_ms
    FROM usage_logs
  `;

  if (userId) {
    query += ` JOIN api_keys ON usage_logs.api_key_id = api_keys.id`;
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (dateRange) {
    conditions.push('timestamp >= ? AND timestamp <= ?');
    params.push(...dateRange);
  }

  if (userId && apiKeyId) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    if (userIds.length === 1) {
      conditions.push('api_keys.user_id = ? AND api_keys.id = ?');
      params.push(userIds[0], apiKeyId);
    } else {
      const placeholders = userIds.map(() => '?').join(', ');
      conditions.push(`api_keys.user_id IN (${placeholders}) AND api_keys.id = ?`);
      params.push(...userIds, apiKeyId);
    }
  } else if (userId) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    if (userIds.length === 1) {
      conditions.push('api_keys.user_id = ?');
      params.push(userIds[0]);
    } else {
      const placeholders = userIds.map(() => '?').join(', ');
      conditions.push(`api_keys.user_id IN (${placeholders})`);
      params.push(...userIds);
    }
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const row = db!.prepare(query).all(params) as any[];

  if (row.length === 0) {
    return {
      requestCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalDurationMs: 0,
      totalTtftMs: 0,
      totalStreamDurationMs: 0,
    };
  }

  const data = row[0];

  // Calculate tokens_per_sec using actual duration from usage logs (hardware throughput)
  let durationQuery = `
    SELECT SUM(duration_ms) as total_duration_ms
    FROM usage_logs
  `;

  if (userId) {
    durationQuery += ` JOIN api_keys ON usage_logs.api_key_id = api_keys.id`;
  }

  const durationConditions: string[] = [];
  const durationParams: (string | number)[] = [];

  if (dateRange) {
    durationConditions.push('timestamp >= ? AND timestamp <= ?');
    durationParams.push(...dateRange);
  }

  if (userId && apiKeyId) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    if (userIds.length === 1) {
      durationConditions.push('api_keys.user_id = ? AND api_keys.id = ?');
      durationParams.push(userIds[0], apiKeyId);
    } else {
      const placeholders = userIds.map(() => '?').join(', ');
      durationConditions.push(`api_keys.user_id IN (${placeholders}) AND api_keys.id = ?`);
      durationParams.push(...userIds, apiKeyId);
    }
  } else if (userId) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    if (userIds.length === 1) {
      durationConditions.push('api_keys.user_id = ?');
      durationParams.push(userIds[0]);
    } else {
      const placeholders = userIds.map(() => '?').join(', ');
      durationConditions.push(`api_keys.user_id IN (${placeholders})`);
      durationParams.push(...userIds);
    }
  }

  if (durationConditions.length > 0) {
    durationQuery += ' WHERE ' + durationConditions.join(' AND ');
  }

  const durationRow = db!.prepare(durationQuery).all(durationParams) as any[];

  const totalDurationMs = durationRow.length > 0 && durationRow[0]
    ? Number(durationRow[0].total_duration_ms || 0)
    : 0;

  return {
    requestCount: Number(data.request_count || 0),
    totalInputTokens: Number(data.total_input_tokens || 0),
    totalOutputTokens: Number(data.total_output_tokens || 0),
    cacheCreationTokens: Number(data.cache_creation_tokens || 0),
    cacheReadTokens: Number(data.cache_read_tokens || 0),
    totalDurationMs,
    totalTtftMs: Number(data.total_ttft_ms || 0),
    totalStreamDurationMs: Number(data.total_stream_duration_ms || 0),
  };
}

function _buildMetricsFromResult(
  result: _AggregatedMetricsResult,
  extraFields: Record<string, number> = {},
): LifetimeMetrics {
  const { requestCount, totalInputTokens, totalOutputTokens, totalDurationMs, cacheCreationTokens, cacheReadTokens, totalTtftMs, totalStreamDurationMs } = result;
  const totalTokens = totalInputTokens + totalOutputTokens;

  let tokensPerSec = 0;
  let inputTokensPerSec = 0;
  let outputTokensPerSec = 0;
  if (totalDurationMs > 0) {
    tokensPerSec = totalTokens * 1000 / totalDurationMs;
    if (totalTtftMs > 0) {
      inputTokensPerSec = totalInputTokens * 1000 / totalTtftMs;
    } else {
      inputTokensPerSec = totalInputTokens * 1000 / totalDurationMs;
    }
    if (totalStreamDurationMs > 0) {
      outputTokensPerSec = totalOutputTokens * 1000 / totalStreamDurationMs;
    } else {
      outputTokensPerSec = totalOutputTokens * 1000 / totalDurationMs;
    }
  }

  return {
    total_tokens: totalTokens,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    tokens_per_sec: Math.round(tokensPerSec * 100) / 100,
    input_tokens_per_sec: Math.round(inputTokensPerSec * 100) / 100,
    output_tokens_per_sec: Math.round(outputTokensPerSec * 100) / 100,
    request_count: requestCount,
    cache_creation_tokens: cacheCreationTokens,
    cache_read_tokens: cacheReadTokens,
    ...extraFields,
  };
}

export function getLifetimeMetrics(userId?: string | string[], apiKeyId?: string): LifetimeMetrics {
  const result = _buildAggregatedMetrics(userId, apiKeyId);
  return _buildMetricsFromResult(result);
}

export function getRangeMetrics(startDate: string, endDate: string, userId?: string | string[], apiKeyId?: string): RangeMetrics {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationSeconds = (end.getTime() - start.getTime()) / 1000 + 1;

  const result = _buildAggregatedMetrics(userId, apiKeyId, [startDate, endDate]);
  return _buildMetricsFromResult(result, { duration_seconds: durationSeconds }) as RangeMetrics;
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
          return `CASE WHEN COUNT(*) = 0 THEN NULL WHEN SUM(ttft_ms) > 0 THEN ROUND(SUM(prompt_tokens) * 1000.0 / SUM(ttft_ms), 2) WHEN SUM(duration_ms) > 0 THEN ROUND(SUM(prompt_tokens) * 1000.0 / SUM(duration_ms), 2) ELSE 0 END`;
        case 'output_tokens_per_sec':
          return `CASE WHEN COUNT(*) = 0 THEN NULL WHEN SUM(stream_duration_ms) > 0 THEN ROUND(SUM(completion_tokens) * 1000.0 / SUM(stream_duration_ms), 2) WHEN SUM(duration_ms) > 0 THEN ROUND(SUM(completion_tokens) * 1000.0 / SUM(duration_ms), 2) ELSE 0 END`;
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
    
    const dataPoints: ProgressiveDataPoint[] = [];
    
    for (let i = bucketStartIndex; i < bucketEndIndex; i++) {
      const bucket = buckets[i];
      
      let query = `
        SELECT ${selectExpr} as value
        FROM usage_logs
      `;
      
      let queryParams: (string | number)[] = [];
      let whereClause = ' WHERE timestamp >= ? AND timestamp < ?';
      let joinClause = '';
      
      queryParams.push(bucket.start.toISOString(), bucket.end.toISOString());
      
      if (apiKeyId) {
        joinClause = ' JOIN api_keys ON usage_logs.api_key_id = api_keys.id';
        whereClause += ' AND api_keys.id = ?';
        queryParams.push(apiKeyId);
      } else if (userId) {
        joinClause = ' JOIN api_keys ON usage_logs.api_key_id = api_keys.id';
        whereClause += ' AND api_keys.user_id = ?';
        queryParams.push(userId);
      }
      
      query += joinClause;
      query += whereClause;
      
      const result = db!.prepare(query).all(queryParams) as any[];
      
      let value: number | null = null;
      if (result.length > 0 && result[0] !== undefined && result[0] !== null) {
        const rawValue = (result[0] as any).value;
        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          value = Number(rawValue);
        } else {
          value = 0;
        }
      } else {
        value = 0;
      }
      
      dataPoints.push({
        timestamp: bucket.start.toISOString(),
        value,
        hasValue: value !== null
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
        value: null,
        hasValue: false
      });
    }
    
    resolve(dataPoints);
  });
}

export function clearDatabase(): void {
  db!.prepare('DELETE FROM usage_logs').run();
  db!.prepare('DELETE FROM users').run();
  db!.prepare('DELETE FROM api_keys').run();
}

// Insights data functions
export function getInsightsData(
  startDate: string,
  endDate: string,
  userId?: string,
  apiKeyId?: string,
  limit?: number
): any[] {
  let query = `
     SELECT 
        ul.id,
        ul.timestamp,
       ul.prompt_tokens,
       ul.completion_tokens,
       ul.total_tokens,
      ul.duration_ms,
        COALESCE(ul.cache_creation_input_tokens, 0) as cache_creation_input_tokens,
       COALESCE(ul.cache_read_input_tokens, 0) as cache_read_input_tokens,
       ak.id as api_key_id,
       ak.name as api_key_name,
       u.id as user_id,
       u.name as user_name,
       u.email as user_email,
      CASE
          WHEN ul.duration_ms > 0 THEN ROUND(ul.total_tokens * 1000.0 / ul.duration_ms, 2)
          ELSE NULL
        END as tokens_per_sec,
        CASE
          WHEN ul.ttft_ms > 0 THEN ROUND(ul.prompt_tokens * 1000.0 / ul.ttft_ms, 2)
          WHEN ul.duration_ms > 0 THEN ROUND(ul.prompt_tokens * 1000.0 / ul.duration_ms, 2)
          ELSE NULL
        END as input_tokens_per_sec,
        CASE
          WHEN ul.stream_duration_ms > 0 THEN ROUND(ul.completion_tokens * 1000.0 / ul.stream_duration_ms, 2)
          WHEN ul.duration_ms > 0 THEN ROUND(ul.completion_tokens * 1000.0 / ul.duration_ms, 2)
          ELSE NULL
        END as output_tokens_per_sec
     FROM usage_logs ul
     LEFT JOIN api_keys ak ON ul.api_key_id = ak.id
     LEFT JOIN users u ON ak.user_id = u.id
  `;

  const queryParams: (string | number)[] = [startDate, endDate];
  let whereClause = 'WHERE ul.timestamp >= ? AND ul.timestamp < ?';

  if (apiKeyId) {
    whereClause += ' AND ul.api_key_id = ?';
    queryParams.push(apiKeyId);
  } else if (userId) {
    whereClause += ' AND ul.api_key_id IN (SELECT id FROM api_keys WHERE user_id = ?)';
    queryParams.push(userId);
  }

  query += ` ${whereClause}`;
  
  query += ' ORDER BY ul.timestamp DESC';
  
  if (limit) {
    query += ' LIMIT ?';
    queryParams.push(limit);
  }

  return db!.prepare(query).all(queryParams) as any[];
}

export function countInsightsData(
  startDate: string,
  endDate: string,
  userId?: string,
  apiKeyId?: string
): number {
  let query = `
    SELECT COUNT(*) as count
    FROM usage_logs ul
  `;

  const queryParams: (string | number)[] = [startDate, endDate];
  let whereClause = 'WHERE ul.timestamp >= ? AND ul.timestamp < ?';

  if (apiKeyId) {
    query += ' JOIN api_keys ak ON ul.api_key_id = ak.id';
    whereClause += ' AND ul.api_key_id = ?';
    queryParams.push(apiKeyId);
  } else if (userId) {
    query += ' JOIN api_keys ak ON ul.api_key_id = ak.id';
    whereClause += ' AND ak.user_id = ?';
    queryParams.push(userId);
  }

  query += ` ${whereClause}`;

  const row = db!.prepare(query).all(queryParams) as any[];
  
  if (row.length === 0 || !row[0]) {
    return 0;
  }

  return Number((row[0] as any).count || 0);
}

function getHeatMapColumnExpr(type: string): string {
  if (type === 'timestamp') {
    return "strftime('%s', ul.timestamp)";
  }
  if (type === 'tokens_per_sec') {
    return "CASE WHEN ul.duration_ms > 0 THEN ROUND(ul.total_tokens * 1000.0 / ul.duration_ms, 2) ELSE NULL END";
  }
  if (type === 'input_tokens_per_sec') {
    return "CASE WHEN ul.ttft_ms > 0 THEN ROUND(ul.prompt_tokens * 1000.0 / ul.ttft_ms, 2) WHEN ul.duration_ms > 0 THEN ROUND(ul.prompt_tokens * 1000.0 / ul.duration_ms, 2) ELSE NULL END";
  }
  if (type === 'output_tokens_per_sec') {
    return "CASE WHEN ul.stream_duration_ms > 0 THEN ROUND(ul.completion_tokens * 1000.0 / ul.stream_duration_ms, 2) WHEN ul.duration_ms > 0 THEN ROUND(ul.completion_tokens * 1000.0 / ul.duration_ms, 2) ELSE NULL END";
  }
  return 'ul.' + type;
}

export function getHeatMapData(
  startDate: string,
  endDate: string,
  xAxisType: string,
  yAxisType: string,
  userId?: string,
  apiKeyId?: string,
  gridWidth: number = 50,
  gridHeight: number = 50
): any[] {
  const xExpr = getHeatMapColumnExpr(xAxisType);
  const yExpr = getHeatMapColumnExpr(yAxisType);
  
  let query = `
    SELECT 
      ${xExpr} as x_val,
      ${yExpr} as y_val
    FROM usage_logs ul
  `;

  const queryParams: (string | number)[] = [startDate, endDate];
  let whereClause = 'WHERE ul.timestamp >= ? AND ul.timestamp < ?';

  if (apiKeyId) {
    query += ' JOIN api_keys ak ON ul.api_key_id = ak.id';
    whereClause += ' AND ul.api_key_id = ?';
    queryParams.push(apiKeyId);
  } else if (userId) {
    query += ' JOIN api_keys ak ON ul.api_key_id = ak.id';
    whereClause += ' AND ak.user_id = ?';
    queryParams.push(userId);
  }

  query += ` ${whereClause}`;

  const results = db!.prepare(query).all(queryParams) as any[];
  
  if (results.length === 0) {
    return [];
  }

  const validRows: number[][] = [];
  for (const row of results) {
    const x = Number(row.x_val);
    const y = Number(row.y_val);
    if (!isNaN(x) && !isNaN(y) && row.x_val !== null && row.y_val !== null) {
      validRows.push([x, y]);
    }
  }
  
  if (validRows.length === 0) {
    return [];
  }

  const xValues = validRows.map(r => r[0]);
  const yValues = validRows.map(r => r[1]);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const xStep = (maxX - minX) / gridWidth || 1;
  const yStep = (maxY - minY) / gridHeight || 1;

  const bins = new Map<string, number>();
  
  for (const [x, y] of validRows) {
    const xBin = Math.min(Math.floor((x - minX) / xStep), gridWidth - 1);
    const yBin = Math.min(Math.floor((y - minY) / yStep), gridHeight - 1);
    
    const key = `${xBin},${yBin}`;
    bins.set(key, (bins.get(key) || 0) + 1);
  }

  return Array.from(bins.entries()).map(([key, count]) => {
    const [xBin, yBin] = key.split(',').map(Number);
    return {
      x: minX + (xBin + 0.5) * xStep,
      y: minY + (yBin + 0.5) * yStep,
      count,
      _xBin: xBin,
      _yBin: yBin,
      _minX: minX,
      _maxX: maxX,
      _minY: minY,
      _maxY: maxY,
      _xStep: xStep,
      _yStep: yStep,
    };
  });
}

export default {
  init,
  isReady,
  createApiKey,
  getApiKeys,
  getApiKeyById,
  getApiKeysByUserId,
  deleteApiKey,
  permanentlyDeleteApiKey,
  updateApiKeyName,
  updateApiKeyDescription,
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
  getInsightsData,
  countInsightsData,
  getHeatMapData,
  close
};
