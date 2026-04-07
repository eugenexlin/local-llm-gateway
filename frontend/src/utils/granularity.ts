export interface GranularityOption {
  value: string; // API format: "5m", "2h"
  label: string; // Display format: "5 minutes", "2 hours"
  intervalMs: number;
  seconds: number; // Duration in seconds
}

export const granularityOptions: GranularityOption[] = [
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
];

export const getGranularityByValue = (
  value: string,
): GranularityOption | undefined => {
  return granularityOptions.find((opt) => opt.value === value);
}

export const getGranularitySeconds = (value: string): number => {
  const option = getGranularityByValue(value);
  return option?.seconds || 60 * 60; // default to hourly in seconds
}

export const getRangeSeconds = (startDate: Date, endDate: Date): number => {
  return (endDate.getTime() - startDate.getTime()) / 1000;
};

export const calculateOptimalGranularity = (
  startDate: Date,
  endDate: Date,
  maxTicks: number = 64,
): string => {
  const rangeSeconds = getRangeSeconds(startDate, endDate);

  if (rangeSeconds <= 0) {
    return "1h";
  }

  const requiredGranularitySeconds = rangeSeconds / maxTicks;

  for (const option of granularityOptions) {
    if (option.seconds >= requiredGranularitySeconds) {
      return option.value;
    }
  }

  return "1M";
};

/**
 * Calculate optimal granularity and return seconds (new preferred method)
 */
export const calculateOptimalGranularitySeconds = (
  startDate: Date,
  endDate: Date,
  maxTicks: number = 64,
): number => {
  const rangeSeconds = getRangeSeconds(startDate, endDate);

  if (rangeSeconds <= 0) {
    return 60 * 60;
  }

  const requiredGranularitySeconds = rangeSeconds / maxTicks;

  for (const option of granularityOptions) {
    if (option.seconds >= requiredGranularitySeconds) {
      return option.seconds;
    }
  }

  return 30 * 24 * 60 * 60;
};

/**
 * @deprecated Use calculateOptimalGranularitySeconds instead
 */
export const calculateOptimalGranularity_DEPRECATED = calculateOptimalGranularity;

