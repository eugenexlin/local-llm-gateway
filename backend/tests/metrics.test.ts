import * as database from '../database';

describe('Metrics - Tokens Per Second Calculation', () => {
  let testApiKeyId: string;
  let testKeyIdHash: string;

  beforeAll(async () => {
    await database.init();
  });

  beforeEach(() => {
    testApiKeyId = 'test-api-key-' + Date.now();
    testKeyIdHash = 'test-key-hash-' + Date.now();
    database.createApiKey({
      id: testApiKeyId,
      name: 'Test API Key',
      key_hash: testKeyIdHash,
      description: 'Test key for metrics',
      user_id: null
    });
  });

  afterAll(() => {
    database.close();
  });

  describe('getProgressiveDataWithInterpolation', () => {
    it('should calculate tokens_per_sec using actual duration (not bucket size)', async () => {
      const timestampPrefix = Date.now();
      const now = new Date();
      const startDate = new Date(now.getTime() - 5000).toISOString();
      const endDate = now.toISOString();

      const testLogs = [
        {
          prompt_tokens: 100,
          completion_tokens: 50,
          duration_ms: 1500,
          timestamp: new Date(now.getTime() - 4000).toISOString(),
        },
        {
          prompt_tokens: 200,
          completion_tokens: 100,
          duration_ms: 3000,
          timestamp: new Date(now.getTime() - 3000).toISOString(),
        },
      ];

      testLogs.forEach(log => {
        database.logUsage({
          api_key_id: testApiKeyId,
          prompt_tokens: log.prompt_tokens,
          completion_tokens: log.completion_tokens,
          total_tokens: log.prompt_tokens + log.completion_tokens,
          duration_ms: log.duration_ms,
          timestamp: log.timestamp,
        });
      });

      const result = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        60,
        'tokens_per_sec'
      );

      const totalTokens = 100 + 50 + 200 + 100;
      const totalDurationMs = 1500 + 3000;
      const expectedTokensPerSec = Math.round((totalTokens * 1000 / totalDurationMs) * 100) / 100;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe(expectedTokensPerSec);
    });

    it('should calculate input_tokens_per_sec using actual duration', async () => {
      const timestampPrefix = Date.now();
      const now = new Date();
      const startDate = new Date(now.getTime() - 5000).toISOString();
      const endDate = now.toISOString();

      const testLogs = [
        {
          prompt_tokens: 100,
          completion_tokens: 50,
          duration_ms: 1000,
          timestamp: new Date(now.getTime() - 4000).toISOString(),
        },
        {
          prompt_tokens: 200,
          completion_tokens: 100,
          duration_ms: 2000,
          timestamp: new Date(now.getTime() - 3000).toISOString(),
        },
      ];

      testLogs.forEach(log => {
        database.logUsage({
          api_key_id: testApiKeyId,
          prompt_tokens: log.prompt_tokens,
          completion_tokens: log.completion_tokens,
          total_tokens: log.prompt_tokens + log.completion_tokens,
          duration_ms: log.duration_ms,
          timestamp: log.timestamp,
        });
      });

      const result = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        60,
        'input_tokens_per_sec'
      );

      const totalInputTokens = 100 + 200;
      const totalDurationMs = 1000 + 2000;
      const expectedInputTokensPerSec = Math.round((totalInputTokens * 1000 / totalDurationMs) * 100) / 100;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe(expectedInputTokensPerSec);
    });

    it('should calculate output_tokens_per_sec using actual duration', async () => {
      const timestampPrefix = Date.now();
      const now = new Date();
      const startDate = new Date(now.getTime() - 5000).toISOString();
      const endDate = now.toISOString();

      const testLogs = [
        {
          prompt_tokens: 100,
          completion_tokens: 50,
          duration_ms: 1000,
          timestamp: new Date(now.getTime() - 4000).toISOString(),
        },
        {
          prompt_tokens: 200,
          completion_tokens: 100,
          duration_ms: 2000,
          timestamp: new Date(now.getTime() - 3000).toISOString(),
        },
      ];

      testLogs.forEach(log => {
        database.logUsage({
          api_key_id: testApiKeyId,
          prompt_tokens: log.prompt_tokens,
          completion_tokens: log.completion_tokens,
          total_tokens: log.prompt_tokens + log.completion_tokens,
          duration_ms: log.duration_ms,
          timestamp: log.timestamp,
        });
      });

      const result = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        60,
        'output_tokens_per_sec'
      );

      const totalOutputTokens = 50 + 100;
      const totalDurationMs = 1000 + 2000;
      const expectedOutputTokensPerSec = Math.round((totalOutputTokens * 1000 / totalDurationMs) * 100) / 100;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe(expectedOutputTokensPerSec);
    });

    it('should handle buckets with zero duration (return 0)', async () => {
      const timestampPrefix = Date.now();
      const now = new Date();
      const startDate = new Date(now.getTime() - 5000).toISOString();
      const endDate = now.toISOString();

      const testLog = {
        prompt_tokens: 100,
        completion_tokens: 50,
        duration_ms: 0,
        timestamp: new Date(now.getTime() - 4000).toISOString(),
      };

      database.logUsage({
        api_key_id: testApiKeyId,
        prompt_tokens: testLog.prompt_tokens,
        completion_tokens: testLog.completion_tokens,
        total_tokens: testLog.prompt_tokens + testLog.completion_tokens,
        duration_ms: testLog.duration_ms,
        timestamp: testLog.timestamp,
      });

      const result = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        60,
        'tokens_per_sec'
      );

      // When duration_ms is 0, we can't calculate a meaningful rate
      // The SQL returns 0 for buckets with requests but zero total duration
      const bucketWithRequests = result.find(r => r.value !== 0);
      if (bucketWithRequests) {
        expect(bucketWithRequests.value).toBe(0);
      }
    });

    it('should return 0 for empty buckets (no requests)', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 5000).toISOString();
      const endDate = now.toISOString();

      const result = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        60,
        'tokens_per_sec'
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].value).toBe(0);
    });

    it('should return consistent values across different granularities', async () => {
      const timestampPrefix = Date.now();
      const now = new Date();
      const endDate = now.toISOString();
      const startDate = new Date(now.getTime() - 5000).toISOString();

      const testLogs = [
        {
          prompt_tokens: 100,
          completion_tokens: 50,
          duration_ms: 1500,
          timestamp: new Date(now.getTime() - 4000).toISOString(),
        },
        {
          prompt_tokens: 200,
          completion_tokens: 100,
          duration_ms: 3000,
          timestamp: new Date(now.getTime() - 3000).toISOString(),
        },
      ];

      testLogs.forEach(log => {
        database.logUsage({
          api_key_id: testApiKeyId,
          prompt_tokens: log.prompt_tokens,
          completion_tokens: log.completion_tokens,
          total_tokens: log.prompt_tokens + log.completion_tokens,
          duration_ms: log.duration_ms,
          timestamp: log.timestamp,
        });
      });

      const result1m = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        60,
        'tokens_per_sec'
      );

      const result1h = await database.getProgressiveDataWithInterpolation(
        startDate,
        endDate,
        3600,
        'tokens_per_sec'
      );

      const totalTokens = 450;
      const totalDurationMs = 4500;
      const expectedTokensPerSec = Math.round((totalTokens * 1000 / totalDurationMs) * 100) / 100;

      expect(result1m[0].value).toBe(expectedTokensPerSec);
      expect(result1h[0].value).toBe(expectedTokensPerSec);
    });
  });
});
