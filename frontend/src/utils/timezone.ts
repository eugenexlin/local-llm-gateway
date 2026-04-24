/**
 * Timezone utilities for handling user timezone detection and UTC conversions
 */

// Storage key for timezone preference
export const TIMEZONE_STORAGE_KEY = 'llm-gateway-timezone';

/**
 * Detect user's browser timezone
 * Uses Intl.DateTimeFormat which is the modern standard way
 */
export function detectUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Save user's timezone preference to localStorage
 */
export function saveTimezonePreference(timezone: string): void {
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
  } catch (error) {
    console.warn('Failed to save timezone preference:', error);
  }
}

/**
 * Get user's saved timezone preference
 * Falls back to detecting browser timezone if not saved
 */
export function getTimezonePreference(): string {
  try {
    const saved = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (saved) {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read timezone preference:', error);
  }
  // Default to browser detected timezone
  return detectUserTimezone();
}

/**
 * Clear user's timezone preference
 */
export function clearTimezonePreference(): void {
  try {
    localStorage.removeItem(TIMEZONE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear timezone preference:', error);
  }
}

/**
 * Format a UTC timestamp to local time string with full date and time
 */
export function formatTimestamp(
  timestamp: string | Date,
  timezone?: string
): string {
  const date = new Date(timestamp);
  const tz = timezone || getTimezonePreference();
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export function formatTimestampRelative(
  timestamp: string | Date,
  timezone?: string
): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  const tz = timezone || getTimezonePreference();
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: diffDays > 60 ? 'numeric' : undefined,
      timeZone: tz,
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}

/**
 * Format just the time portion
 */
export function formatTime(timestamp: string | Date, timezone?: string): string {
  const date = new Date(timestamp);
  const tz = timezone || getTimezonePreference();
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format just the date portion
 */
export function formatDate(timestamp: string | Date, timezone?: string): string {
  const date = new Date(timestamp);
  const tz = timezone || getTimezonePreference();
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Get Unix timestamp in seconds from a Date
 */
export function getUnixTimestamp(date: Date | string | number): number {
  const d = new Date(date);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Get ISO string in UTC from a Date
 */
export function toISOString(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString();
}

/**
 * Round a date down to the nearest second boundary
 */
export function roundToSecond(date: Date): Date {
  const timestamp = Math.floor(date.getTime() / 1000) * 1000;
  return new Date(timestamp);
}

/**
 * Check if a date is in UTC timezone
 */
export function isUTC(date: Date): boolean {
  const utcString = date.toISOString();
  const dateObj = new Date(utcString);
  return dateObj.getTime() === date.getTime();
}
