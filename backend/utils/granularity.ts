import type { GranularitySeconds } from '../types/metrics';

/**
 * Round a Date down to the nearest granularity boundary
 * @param date - The date to round
 * @param granularitySeconds - Granularity in seconds
 * @returns Rounded date
 */
export function roundToGranularity(date: Date, granularitySeconds: GranularitySeconds): Date {
  const timestamp = Math.floor(date.getTime() / 1000);
  const roundedTimestamp = Math.floor(timestamp / granularitySeconds) * granularitySeconds;
  return new Date(roundedTimestamp * 1000);
}

/**
 * Round a Date up to the next granularity boundary
 * @param date - The date to round
 * @param granularitySeconds - Granularity in seconds
 * @returns Rounded date
 */
export function roundUpToGranularity(date: Date, granularitySeconds: GranularitySeconds): Date {
  const timestamp = Math.floor(date.getTime() / 1000);
  const roundedTimestamp = Math.ceil(timestamp / granularitySeconds) * granularitySeconds;
  return new Date(roundedTimestamp * 1000);
}

/**
 * Calculate the optimal granularity in seconds based on a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param maxTicks - Maximum number of ticks desired (default 64)
 * @returns Optimal granularity in seconds
 */
export function calculateOptimalGranularitySeconds(
  startDate: Date,
  endDate: Date,
  maxTicks: number = 64
): GranularitySeconds {
  const rangeMs = endDate.getTime() - startDate.getTime();
  const rangeSeconds = rangeMs / 1000;

  if (rangeSeconds <= 0) {
    return 60 * 60; // Default to 1 hour
  }

  const requiredGranularitySeconds = rangeSeconds / maxTicks;

  const granularityOptions: GranularitySeconds[] = [
    5 * 60,      // 5 minutes
    10 * 60,     // 10 minutes
    15 * 60,     // 15 minutes
    30 * 60,     // 30 minutes
    60 * 60,     // 1 hour
    2 * 60 * 60, // 2 hours
    4 * 60 * 60, // 4 hours
    6 * 60 * 60, // 6 hours
    12 * 60 * 60,// 12 hours
    24 * 60 * 60, // 1 day
    7 * 24 * 60 * 60, // 1 week
    30 * 24 * 60 * 60, // 1 month
  ];

  for (const option of granularityOptions) {
    if (option >= requiredGranularitySeconds) {
      return option;
    }
  }

  return 30 * 24 * 60 * 60; // Default to 1 month
}

/**
 * Get the range in seconds between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Range in seconds
 */
export function getRangeSeconds(startDate: Date, endDate: Date): number {
  return (endDate.getTime() - startDate.getTime()) / 1000;
}

/**
 * Get the next bucket start time
 * @param timestamp - Current timestamp in milliseconds
 * @param granularitySeconds - Granularity in seconds
 * @returns Next bucket start time
 */
export function getNextBucketStart(
  timestamp: number,
  granularitySeconds: GranularitySeconds
): number {
  const currentSeconds = Math.floor(timestamp / 1000);
  const nextBucket = Math.ceil(currentSeconds / granularitySeconds) * granularitySeconds;
  return nextBucket * 1000;
}

/**
 * Get the previous bucket start time
 * @param timestamp - Current timestamp in milliseconds
 * @param granularitySeconds - Granularity in seconds
 * @returns Previous bucket start time
 */
export function getPreviousBucketStart(
  timestamp: number,
  granularitySeconds: GranularitySeconds
): number {
  const currentSeconds = Math.floor(timestamp / 1000);
  const prevBucket = Math.floor(currentSeconds / granularitySeconds) * granularitySeconds;
  return prevBucket * 1000;
}
