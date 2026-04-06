import express, { Request, Response } from 'express';
import * as database from '../database';

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
router.get('/lifetime', (_req: Request, res: Response) => {
  try {
    const metrics = database.getLifetimeMetrics();
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
    
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }
    
    const metrics = database.getRangeMetrics(start, end);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting range metrics:', error);
    res.status(500).json({ error: 'Failed to get range metrics' });
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
    const granularity = req.query.granularity as 'hourly' | 'daily' | 'weekly' | 'monthly' | undefined;
    const metric = req.query.metric as 'total_tokens' | 'input_tokens' | 'output_tokens' | 'requests' | 'tokens_per_sec' | undefined;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }
    
    if (!granularity || !['hourly', 'daily', 'weekly', 'monthly'].includes(granularity)) {
      return res.status(400).json({ error: 'valid granularity required' });
    }
    
    if (!metric || !['total_tokens', 'input_tokens', 'output_tokens', 'requests', 'tokens_per_sec'].includes(metric)) {
      return res.status(400).json({ error: 'valid metric required' });
    }
    
    const dataPoints = await database.getProgressiveData(start, end, granularity, metric);
    
    res.setHeader('Content-Type', 'application/json');
    res.json(dataPoints);
  } catch (error) {
    console.error('Error getting progressive data:', error);
    res.status(500).json({ error: 'Failed to get progressive data' });
  }
});

// Catch-all to prevent returning HTML
router.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default router;
