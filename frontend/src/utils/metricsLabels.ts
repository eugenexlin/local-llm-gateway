import type { MetricType } from '../types/metrics';

export const metricLabels: Record<MetricType, string> = {
  total_tokens: 'Total Tokens',
  input_tokens: 'Input Tokens',
  output_tokens: 'Output Tokens',
  requests: 'Requests',
  tokens_per_sec: 'Tokens/Sec',
};

export default metricLabels;
