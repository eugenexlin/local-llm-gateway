export type MetricType = 
  | 'total_tokens' 
  | 'input_tokens' 
  | 'output_tokens' 
  | 'requests' 
  | 'tokens_per_sec'
  | 'input_tokens_per_sec'
  | 'output_tokens_per_sec';

export interface Metrics {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  tokens_per_sec: number;
  input_tokens_per_sec: number;
  output_tokens_per_sec: number;
}

// Granularity is now represented as seconds (integer)
export type GranularitySeconds = number;

// Predefined granularity constants
export const Granularity = {
  FIVE_MINUTES: 5 * 60,
  TEN_MINUTES: 10 * 60,
  FIFTEEN_MINUTES: 15 * 60,
  THIRTY_MINUTES: 30 * 60,
  ONE_HOUR: 60 * 60,
  TWO_HOURS: 2 * 60 * 60,
  FOUR_HOURS: 4 * 60 * 60,
  SIX_HOURS: 6 * 60 * 60,
  TWELVE_HOURS: 12 * 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
} as const;

export type GranularityConstant = typeof Granularity[keyof typeof Granularity];

// API display values (only for UI layer)
export interface GranularityDisplayOption {
  seconds: number;
  label: string;
  value: string; // Legacy API value for dropdown
}

export const GranularityDisplay: Record<string, GranularityDisplayOption> = {
  '5m': { seconds: 5 * 60, label: '5 minutes', value: '5m' },
  '10m': { seconds: 10 * 60, label: '10 minutes', value: '10m' },
  '15m': { seconds: 15 * 60, label: '15 minutes', value: '15m' },
  '30m': { seconds: 30 * 60, label: '30 minutes', value: '30m' },
  '1h': { seconds: 60 * 60, label: '1 hour', value: '1h' },
  '2h': { seconds: 2 * 60 * 60, label: '2 hours', value: '2h' },
  '4h': { seconds: 4 * 60 * 60, label: '4 hours', value: '4h' },
  '6h': { seconds: 6 * 60 * 60, label: '6 hours', value: '6h' },
  '12h': { seconds: 12 * 60 * 60, label: '12 hours', value: '12h' },
  '1d': { seconds: 24 * 60 * 60, label: '1 day', value: '1d' },
  '1w': { seconds: 7 * 24 * 60 * 60, label: '1 week', value: '1w' },
  '1M': { seconds: 30 * 24 * 60 * 60, label: '1 month', value: '1M' },
};

export const getAllGranularityDisplayOptions = (): GranularityDisplayOption[] => {
  return Object.values(GranularityDisplay);
};

export const getGranularityDisplayBySeconds = (seconds: number): GranularityDisplayOption | undefined => {
  return Object.values(GranularityDisplay).find(opt => opt.seconds === seconds);
};

export const getGranularityDisplayByValue = (value: string): GranularityDisplayOption | undefined => {
  return GranularityDisplay[value];
};

export const secondsToDisplayValue = (seconds: number): string | undefined => {
  const option = getGranularityDisplayBySeconds(seconds);
  return option?.value;
};

export const displayValueToSeconds = (value: string): number | undefined => {
  const option = getGranularityDisplayByValue(value);
  return option?.seconds;
};

export const displayLabelToSeconds = (label: string): number | undefined => {
  return Object.values(GranularityDisplay).find(opt => opt.label === label)?.seconds;
};

export const secondsToDisplayLabel = (seconds: number): string | undefined => {
  const option = getGranularityDisplayBySeconds(seconds);
  return option?.label;
};

// Insights graph types
export type AxisType = 
  | 'timestamp'
  | 'prompt_tokens'
  | 'completion_tokens'
  | 'total_tokens'
  | 'duration_ms'
  | 'tokens_per_sec'
  | 'input_tokens_per_sec'
  | 'output_tokens_per_sec'
  | 'cache_creation_input_tokens'
  | 'cache_read_input_tokens';

export interface AxisConfig {
  type: AxisType;
  label: string;
  unit?: string;
  scale?: 'linear' | 'log';
}

export interface PresetConfig {
  id: string;
  label: string;
  xAxis: AxisType;
  yAxis: AxisType;
  description: string;
}

export interface InsightsDataPoint {
  id: number;
  timestamp: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  api_key_name?: string;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  tokens_per_sec?: number;
  input_tokens_per_sec?: number;
  output_tokens_per_sec?: number;
}

export interface HeatMapDataPoint {
  x: number;
  y: number;
  count: number;
}
