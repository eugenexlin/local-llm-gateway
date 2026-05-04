/**
 * UI granularity display options
 * Only used for display in selectors and dropdowns
 * Backend and internal logic use seconds
 */

export interface GranularityDisplayOption {
  seconds: number;
  label: string;
  value: string; // Legacy API value for dropdown
  intervalMs: number;
}

export const granularityDisplayOptions: readonly GranularityDisplayOption[] = [
  {
    value: "5m",
    label: "5 minutes",
    intervalMs: 5 * 60 * 1000,
    seconds: 5 * 60,
  },
  {
    value: "10m",
    label: "10 minutes",
    intervalMs: 10 * 60 * 1000,
    seconds: 10 * 60,
  },
  {
    value: "15m",
    label: "15 minutes",
    intervalMs: 15 * 60 * 1000,
    seconds: 15 * 60,
  },
  {
    value: "30m",
    label: "30 minutes",
    intervalMs: 30 * 60 * 1000,
    seconds: 30 * 60,
  },
  {
    value: "1h",
    label: "1 hour",
    intervalMs: 60 * 60 * 1000,
    seconds: 60 * 60,
  },
  {
    value: "2h",
    label: "2 hours",
    intervalMs: 2 * 60 * 60 * 1000,
    seconds: 2 * 60 * 60,
  },
  {
    value: "4h",
    label: "4 hours",
    intervalMs: 4 * 60 * 60 * 1000,
    seconds: 4 * 60 * 60,
  },
  {
    value: "6h",
    label: "6 hours",
    intervalMs: 6 * 60 * 60 * 1000,
    seconds: 6 * 60 * 60,
  },
  {
    value: "12h",
    label: "12 hours",
    intervalMs: 12 * 60 * 60 * 1000,
    seconds: 12 * 60 * 60,
  },
  {
    value: "1d",
    label: "1 day",
    intervalMs: 24 * 60 * 60 * 1000,
    seconds: 24 * 60 * 60,
  },
  {
    value: "1w",
    label: "1 week",
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    seconds: 7 * 24 * 60 * 60,
  },
  {
    value: "1M",
    label: "1 month",
    intervalMs: 30 * 24 * 60 * 60 * 1000,
    seconds: 30 * 24 * 60 * 60,
  },
] as const;

/**
 * Get granularity option by seconds
 */
export const getGranularityBySeconds = (
  seconds: number,
): GranularityDisplayOption | undefined => {
  return granularityDisplayOptions.find((opt) => opt.seconds === seconds);
};

/**
 * Get granularity option by value string (for backward compatibility)
 */
export const getGranularityByValue = (
  value: string,
): GranularityDisplayOption | undefined => {
  return granularityDisplayOptions.find((opt) => opt.value === value);
};

/**
 * Get all granularity options
 */
export const getAllGranularityOptions = (): GranularityDisplayOption[] => {
  return [...granularityDisplayOptions];
};

/**
 * Convert seconds to display value string (for API)
 */
export const secondsToDisplayValue = (seconds?: number): string => {
  if (seconds === undefined) {
    return "";
  }
  const option = getGranularityBySeconds(seconds);
  if (option === undefined) {
    return "";
  }
  return option.value;
};

/**
 * Convert display value string to seconds
 */
export const displayValueToSeconds = (value: string): number | undefined => {
  const option = getGranularityByValue(value);
  return option?.seconds;
};

/**
 * Convert display label to seconds
 */
export const displayLabelToSeconds = (label: string): number | undefined => {
  return granularityDisplayOptions.find((opt) => opt.label === label)?.seconds;
};

/**
 * Convert seconds to display label
 */
export const secondsToDisplayLabel = (seconds: number): string | undefined => {
  const option = getGranularityBySeconds(seconds);
  return option?.label;
};

/**
 * Validate if seconds is a valid granularity
 */
export const isValidGranularitySeconds = (seconds: number): boolean => {
  return granularityDisplayOptions.some((opt) => opt.seconds === seconds);
};
