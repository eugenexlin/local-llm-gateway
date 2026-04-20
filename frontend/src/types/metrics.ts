export type MetricType = 
  | 'total_tokens' 
  | 'input_tokens' 
  | 'output_tokens' 
  | 'requests' 
  | 'tokens_per_sec'
  | 'input_tokens_per_sec'
  | 'output_tokens_per_sec';

export interface  ProgressiveDataPoint {
  timestamp: string;
  value: number | null;
  hasValue: boolean;
  userId?: string;
}

export interface Metrics {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  requests: number;
  tokens_per_sec: number;
  input_tokens_per_sec: number;
  output_tokens_per_sec: number;
}

// Granularity is now represented as seconds (integer) throughout the app
// Only the UI layer converts to string values for display
export type GranularitySeconds = number;

// Import display options from utility
export type GranularityDisplayOption = {
  seconds: number;
  label: string;
  value: string;
  intervalMs: number;
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
  id: string;
  request_id: string;
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

export interface InsightsConfig {
  xAxis: AxisType | null;
  yAxis: AxisType | null;
  viewMode: 'scatter' | 'heatmap';
  presetId?: string;
}
