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

export default router;
