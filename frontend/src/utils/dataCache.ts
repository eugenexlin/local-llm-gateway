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
): string {
  return `${timestamp}-${granularity}-${metric}`;
}

export function lookupCache(
  timestamp: string,
  granularity: number,
  metric: string,
): ProgressiveDataPoint | undefined {
  const key = buildCacheKey(timestamp, granularity, metric);
  return cache.get(key);
}

export function writeCache(
  dataPoints: ProgressiveDataPoint[],
  granularity: number,
  metric: string,
): void {
  for (const point of dataPoints) {
    const key = buildCacheKey(point.timestamp, granularity, metric);
    cache.set(key, point);
  }
}

export function mergeCachedData(
  allData: ProgressiveDataPoint[],
  granularity: number,
  metric: string,
): void {
  for (let i = 0; i < allData.length; i++) {
    const key = buildCacheKey(allData[i].timestamp, granularity, metric);
    const cached = cache.get(key);
    if (cached && cached.hasValue) {
      allData[i] = { ...cached };
    }
  }
}
