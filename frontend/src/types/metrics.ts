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
