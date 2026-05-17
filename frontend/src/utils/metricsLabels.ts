import type { MetricType } from '../types/metrics';

export const metricLabels: Record<MetricType, string> = {
  total_tokens: 'Total Tokens',
  input_tokens: 'Prompt Tokens',
  output_tokens: 'Completion Tokens',
  requests: 'Requests',
  tokens_per_sec: 'Average TPS',
  input_tokens_per_sec: 'Prompt TPS',
  output_tokens_per_sec: 'Completion TPS',
  duration_ms: 'Duration (ms)',
  ttft_ms: 'TTFT (ms)',
  stream_duration_ms: 'Stream Duration (ms)',
};

export default metricLabels;
