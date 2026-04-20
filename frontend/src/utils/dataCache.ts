import type { ProgressiveDataPoint } from "../types/metrics";

const CACHE_STORAGE_KEY = "llm-gateway-cache-enabled";

const cache = new Map<string, ProgressiveDataPoint>();

export function getCache(): Map<string, ProgressiveDataPoint> {
  return cache;
}

export function getCacheSize(): number {
  return cache.size;
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheEnabled(): boolean {
  try {
    const saved = localStorage.getItem(CACHE_STORAGE_KEY);
    return saved !== "false";
  } catch {
    return true;
  }
}

export function setCacheEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, String(enabled));
  } catch {
    // silently fail
  }
}

export function buildCacheKey(
  timestamp: string,
  granularity: number,
  metric: string,
  userId: string | null = null,
  apiKeyId: string | null = null,
): string {
  const userPrefix = userId ? `${userId}-` : "";
  const apiKeyPrefix = apiKeyId ? `${apiKeyId}-` : "";
  return `${userPrefix}${apiKeyPrefix}${timestamp}-${granularity}-${metric}`;
}

export function lookupCache(
  timestamp: string,
  granularity: number,
  metric: string,
  userId: string | null = null,
  apiKeyId: string | null = null,
): ProgressiveDataPoint | undefined {
  const key = buildCacheKey(timestamp, granularity, metric, userId, apiKeyId);
  return cache.get(key);
}

export function writeCache(
  dataPoints: ProgressiveDataPoint[],
  granularity: number,
  metric: string,
  userId: string | null = null,
  apiKeyId: string | null = null,
): void {
  for (const point of dataPoints) {
    const key = buildCacheKey(point.timestamp, granularity, metric, userId, apiKeyId);
    cache.set(key, point);
  }
}

export function mergeCachedData(
  allData: ProgressiveDataPoint[],
  granularity: number,
  metric: string,
  userId: string | null = null,
  apiKeyId: string | null = null,
): void {
  for (let i = 0; i < allData.length; i++) {
    const key = buildCacheKey(allData[i].timestamp, granularity, metric, userId, apiKeyId);
    const cached = cache.get(key);
    if (cached && cached.hasValue) {
      allData[i] = { ...cached };
    }
  }
}
