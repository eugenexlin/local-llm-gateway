import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  LinearProgress,
  Button
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { metricLabels } from '../utils/metricsLabels';

export interface ProgressiveDataPoint {
  timestamp: string;
  value: number;
}

interface ProgressiveGraphProps {
  data: ProgressiveDataPoint[];
  granularity: '5min' | '15min' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  metric: 'total_tokens' | 'input_tokens' | 'output_tokens' | 'requests' | 'tokens_per_sec';
  loading: boolean;
}

const ProgressiveGraph: React.FC<ProgressiveGraphProps> = ({
  data,
  granularity,
  metric,
  loading
}) => {
  // Data and loading state managed by parent component

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Metric</InputLabel>
          <Select
            value={metric}
            label="Metric"
            onChange={() => {}}
          >
            {Object.entries(metricLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Granularity</InputLabel>
          <Select
            value={granularity}
            label="Granularity"
            onChange={() => {}}
          >
            <MenuItem value="5min">5 minutes</MenuItem>
            <MenuItem value="15min">15 minutes</MenuItem>
            <MenuItem value="hourly">Hourly</MenuItem>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="indeterminate" 
            sx={{ 
              height: 8, 
              borderRadius: 1,
              animation: 'sweep 1s ease-in-out infinite',
              '@keyframes sweep': {
                '0%': { backgroundPosition: '200% 0' },
                '100%': { backgroundPosition: '-200% 0' }
              }
            }} 
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Loading data points...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.length} points loaded
            </Typography>
          </Box>
        </Box>
      )}

      {!loading && data.length > 0 && (
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (granularity === '5min' || granularity === '15min') {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  if (granularity === 'hourly') {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  if (granularity === 'daily') {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                  if (granularity === 'weekly') {
                    return date.toLocaleDateString('en-US', { week: 'numeric', year: '2-digit' });
                  }
                  if (granularity === 'monthly') {
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  }
                  return value;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [Math.round(value).toLocaleString(), metricLabels[metric]]}
                labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1976d2"
                strokeWidth={2}
                dot={false}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {!loading && data.length === 0 && (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">
            No data available for the selected range
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ProgressiveGraph;
