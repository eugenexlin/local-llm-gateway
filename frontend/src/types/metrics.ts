export type MetricType = 
  | 'total_tokens' 
  | 'input_tokens' 
  | 'output_tokens' 
  | 'requests' 
  | 'tokens_per_sec'
  | 'input_tokens_per_sec'
  | 'output_tokens_per_sec'
  | 'duration_ms'
  | 'ttft_ms'
  | 'stream_duration_ms';

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
  duration_ms: number;
  ttft_ms: number;
  stream_duration_ms: number;
}

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
  | 'cache_read_input_tokens'
  | 'ttft_ms'
  | 'stream_duration_ms';

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
  user_id?: string;
  user_name?: string;
  user_email?: string;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  tokens_per_sec?: number;
  input_tokens_per_sec?: number;
  output_tokens_per_sec?: number;
  ttft_ms?: number;
  stream_duration_ms?: number;
  model?: string;
}

export interface HeatMapDataPoint {
  x: number;
  y: number;
  count: number;
  xBin: number;
  yBin: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  xStep: number;
  yStep: number;
}

export type BarGrouping = 'side-by-side' | 'stacked';

export interface InsightsConfig {
  xAxis: AxisType | null;
  yAxis: AxisType | null;
  viewMode: string;
  presetId?: string;
}

// Server config types
export interface ServerEndpointConfig {
  url: string;
  models: string[];
}

export interface ServerConfigItem {
  id: string;
  name: string;
  endpoints: ServerEndpointConfig[];
}

export interface EndpointHealthInfo {
  url: string;
  healthy: boolean;
  models: string[];
  error?: string;
}

export interface ServerHealthInfo {
  id: string;
  name?: string;
  healthy: boolean;
  endpoints: EndpointHealthInfo[];
  lastChecked: string;
}
