import express, { Request, Response } from 'express';
import * as database from '../database';
import type { MetricType, GranularitySeconds } from '../types/metrics';
import { getAllGranularityDisplayOptions } from '../types/metrics';

const router = express.Router();

const getStringQueryParam = (value: string | string[] | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
};

const getNumberQueryParam = (value: string | string[] | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const strValue = Array.isArray(value) ? value[0] : value;
  return parseInt(strValue);
};

// Get usage logs
router.get('/usage', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit as string | string[] | undefined;
    const offset = req.query.offset as string | string[] | undefined;
    const logs = database.getUsageLogs({
      limit: getNumberQueryParam(limit) || 100,
      offset: getNumberQueryParam(offset) || 0
    });
    res.json(logs);
  } catch (error) {
    console.error('Error getting usage logs:', error);
    res.status(500).json({ error: 'Failed to get usage logs' });
  }
});

// Get aggregated usage
router.get('/usage/aggregated', (req: Request, res: Response) => {
  try {
    const period = req.query.period as string | string[] | undefined;
    const aggregated = database.getAggregatedUsage(getStringQueryParam(period) || '7d');
    res.json(aggregated);
  } catch (error) {
    console.error('Error getting aggregated usage:', error);
    res.status(500).json({ error: 'Failed to get aggregated usage' });
  }
});

// Get usage summary
router.get('/usage/summary', (_req: Request, res: Response) => {
  try {
    const summary = database.getUsageSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting usage summary:', error);
    res.status(500).json({ error: 'Failed to get usage summary' });
  }
});

// Get usage trends
router.get('/trends', (req: Request, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }
    
    const trends = database.getUsageTrends(start, end);
    res.json(trends);
  } catch (error) {
    console.error('Error getting usage trends:', error);
    res.status(500).json({ error: 'Failed to get usage trends' });
  }
});

// Get lifetime metrics
router.get('/lifetime', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const apiKeyId = req.query.apiKeyId as string | undefined;
    
    const metrics = database.getLifetimeMetrics(userId, apiKeyId);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting lifetime metrics:', error);
    res.status(500).json({ error: 'Failed to get lifetime metrics' });
  }
});

// Get range metrics
router.get('/range', (req: Request, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const userId = req.query.userId as string | undefined;
    const apiKeyId = req.query.apiKeyId as string | undefined;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }
    
    const metrics = database.getRangeMetrics(start, end, userId, apiKeyId);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting range metrics:', error);
    res.status(500).json({ error: 'Failed to get range metrics' });
  }
});

// Get all users
router.get('/users', (_req: Request, res: Response) => {
  try {
    const users = database.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get API keys for a specific user (authenticated users can only see their own)
router.get('/users/:userId/api-keys', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { show_revoked } = req.query;
    
    // Only allow users to see their own API keys
    const sessionUser = (req as any).user;
    if (sessionUser && sessionUser.id && sessionUser.id !== userIdStr) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const apiKeys = database.getApiKeysByUserIdFilter(userIdStr, show_revoked === 'true');
    res.json(apiKeys);
  } catch (error) {
    console.error('Error getting API keys for user:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

// Get cache usage summary
router.get('/cache-summary', (_req: Request, res: Response) => {
  try {
    const result = database.getDb()?.exec(`
      SELECT 
        SUM(cache_creation_input_tokens) as total_cache_creation,
        SUM(cache_read_input_tokens) as total_cache_read,
        COUNT(DISTINCT CASE WHEN cache_creation_input_tokens > 0 OR cache_read_input_tokens > 0 THEN request_id END) as cached_requests
      FROM usage_logs
    `);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({
        total_cache_creation: 0,
        total_cache_read: 0,
        cached_requests: 0
      });
    }
    
    const row = result[0].values[0] as (string | number | null)[];
    res.json({
      total_cache_creation: Number(row[0] || 0),
      total_cache_read: Number(row[1] || 0),
      cached_requests: Number(row[2] || 0)
    });
  } catch (error) {
    console.error('Error getting cache summary:', error);
    res.status(500).json({ error: 'Failed to get cache summary' });
  }
});

// Get progressive data for graph
router.get('/progressive', async (req: Request, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const granularityValue = req.query.granularity as string | undefined;
    const metric = req.query.metric as MetricType | undefined;
    const batchIndex = parseInt(req.query.batchIndex as string || '0');
    const batchSize = parseInt(req.query.batchSize as string || '16');
    const userId = req.query.userId as string | undefined;
    const apiKeyId = req.query.apiKeyId as string | undefined;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }
    
    // Convert string granularity value to seconds (e.g., "1h" -> 3600)
    let granularitySeconds: GranularitySeconds | undefined;
    if (granularityValue) {
      const validGranularities = getAllGranularityDisplayOptions();
      const found = validGranularities.find(opt => opt.value === granularityValue);
      if (found) {
        granularitySeconds = found.seconds;
      }
    }
    
    if (!granularitySeconds) {
      return res.status(400).json({ error: 'valid granularity required (5m, 10m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w, 1M)' });
    }
    
    const validMetrics: MetricType[] = ['total_tokens', 'input_tokens', 'output_tokens', 'requests', 'tokens_per_sec', 'input_tokens_per_sec', 'output_tokens_per_sec'];
    if (!metric || !validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'valid metric required (total_tokens, input_tokens, output_tokens, requests, tokens_per_sec, input_tokens_per_sec, output_tokens_per_sec)' });
    }
    
    if (isNaN(batchIndex) || batchIndex < 0) {
      return res.status(400).json({ error: 'batchIndex must be a non-negative integer' });
    }
    
    if (isNaN(batchSize) || batchSize <= 0) {
      return res.status(400).json({ error: 'batchSize must be a positive integer' });
    }
    
    const dataPoints = await database.getProgressiveDataWithInterpolation(
      start, 
      end, 
      granularitySeconds, 
      metric, 
      batchIndex, 
      batchSize,
      userId,
      apiKeyId
    );
    
    res.setHeader('Content-Type', 'application/json');
    res.json(dataPoints);
  } catch (error) {
    console.error('Error getting progressive data:', error);
    res.status(500).json({ error: 'Failed to get progressive data' });
  }
});

// Get timestamp template for graph (pre-populate with exact timestamps)
router.get('/timestamps', async (req: Request, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const granularityValue = req.query.granularity as string | undefined;
    const userId = req.query.userId as string | undefined;
    const apiKeyId = req.query.apiKeyId as string | undefined;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }
    
    // Convert string granularity value to seconds (e.g., "1h" -> 3600)
    let granularitySeconds: GranularitySeconds | undefined;
    if (granularityValue) {
      const validGranularities = getAllGranularityDisplayOptions();
      const found = validGranularities.find(opt => opt.value === granularityValue);
      if (found) {
        granularitySeconds = found.seconds;
      }
    }
    
    if (!granularitySeconds) {
      return res.status(400).json({ error: 'valid granularity required (5m, 10m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w, 1M)' });
    }
    
    const dataPoints = await database.getTimestampTemplate(
      start, 
      end, 
      granularitySeconds,
      userId,
      apiKeyId
    );
    
    res.setHeader('Content-Type', 'application/json');
    res.json(dataPoints);
  } catch (error) {
    console.error('Error getting timestamp template:', error);
    res.status(500).json({ error: 'Failed to get timestamp template' });
  }
});

// Catch-all to prevent returning HTML
router.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default router;
