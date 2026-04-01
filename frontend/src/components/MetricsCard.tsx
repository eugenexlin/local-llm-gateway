import React from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';

interface MetricsCardProps {
  title: string;
  value?: number;
  subtitle?: string;
  loading?: boolean;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, subtitle, loading = false }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  if (loading) {
    return (
      <Paper sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        minWidth: 120
      }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 1 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      minWidth: 120
    }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h5" fontWeight="bold" color="primary">
        {value !== undefined ? formatNumber(value) : '0'}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};

export default MetricsCard;
