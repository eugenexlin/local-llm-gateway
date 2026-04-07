export type MetricType = 
  | 'total_tokens' 
  | 'input_tokens' 
  | 'output_tokens' 
  | 'requests' 
  | 'tokens_per_sec';

export interface Metrics {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  requests: number;
  tokens_per_sec: number;
}
