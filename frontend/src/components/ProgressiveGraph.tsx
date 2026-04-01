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

interface ProgressiveGraphProps {
  startDate: Date | null;
  endDate: Date | null;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  metric: 'total_tokens' | 'input_tokens' | 'output_tokens' | 'requests' | 'tokens_per_sec';
}

const ProgressiveGraph: React.FC<ProgressiveGraphProps> = ({
  startDate,
  endDate,
  granularity,
  metric
}) => {
  const [data, setData] = useState<Array<{ timestamp: string; value: number }>>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = async () => {
    if (!startDate || !endDate) {
      setError('Please select a date range');
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);
    setProgress(0);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `/api/metrics/progressive?start=${startDate.toISOString()}&end=${endDate.toISOString()}&granularity=${granularity}&metric=${metric}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const jsonData = await response.json();
      setData(jsonData);
      setProgress(100);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request cancelled by user');
        setError(null);
      } else {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, granularity, metric]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setError(null);
  };

  const handleMetricChange = (event: SelectChangeEvent<string>) => {
    // Metric change will trigger useEffect
  };

  if (error && !loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Metric</InputLabel>
          <Select
            value={metric}
            label="Metric"
            onChange={handleMetricChange}
          >
            {Object.entries(metricLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 1 }} 
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption">{progress.toFixed(0)}%</Typography>
            <Button 
              size="small" 
              variant="outlined"
              onClick={handleCancel}
              disabled={!loading}
            >
              Cancel
            </Button>
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
