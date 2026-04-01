import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import MetricsCard from './MetricsCard';
import DateRangePicker from './DateRangePicker';
import ProgressiveGraph from './ProgressiveGraph';

interface Metrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  request_count: number;
}

const DashboardStats: React.FC = () => {
  const [lifetimeMetrics, setLifetimeMetrics] = useState<Metrics | null>(null);
  const [rangeMetrics, setRangeMetrics] = useState<Metrics | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [granularity, setGranularity] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [metric, setMetric] = useState<'total_tokens' | 'input_tokens' | 'output_tokens' | 'requests' | 'tokens_per_sec'>('total_tokens');
  const [loading, setLoading] = useState(true);

  const fetchLifetimeMetrics = async () => {
    try {
      const response = await fetch('/api/metrics/lifetime');
      if (response.ok) {
        const data = await response.json();
        setLifetimeMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching lifetime metrics:', error);
    }
  };

  const fetchRangeMetrics = async () => {
    if (!startDate || !endDate) return;
    
    try {
      const response = await fetch(
        `/api/metrics/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setRangeMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching range metrics:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLifetimeMetrics(),
        fetchRangeMetrics()
      ]);
      setLoading(false);
    };
    loadData();
  }, [startDate, endDate]);

  const renderMetricRow = (title: string, value?: number, loading?: boolean) => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        mb: 1
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 600,
          color: loading ? 'text.disabled' : 'text.primary'
        }}
      >
        {loading || value === undefined ? '-' : value.toLocaleString()}
      </Typography>
    </Box>
  );

  const lifetimeCards = [
    { title: 'Total Tokens', value: lifetimeMetrics?.total_tokens },
    { title: 'Total Input', value: lifetimeMetrics?.total_input_tokens },
    { title: 'Total Output', value: lifetimeMetrics?.total_output_tokens },
    { title: 'Tokens/Sec', value: lifetimeMetrics?.tokens_per_sec },
    { title: 'Request Count', value: lifetimeMetrics?.request_count },
  ];

  const rangeCards = [
    { title: 'Total Tokens', value: rangeMetrics?.total_tokens },
    { title: 'Total Input', value: rangeMetrics?.total_input_tokens },
    { title: 'Total Output', value: rangeMetrics?.total_output_tokens },
    { title: 'Tokens/Sec', value: rangeMetrics?.tokens_per_sec },
    { title: 'Request Count', value: rangeMetrics?.request_count },
  ];

  return (
    <>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </Box>
      )}

      {!loading && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lifetime Metrics
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {lifetimeCards.map(card => (
              <Grid key={card.title} sx={{ mb: 1, gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 2.4' } }}>
                {renderMetricRow(card.title, card.value, loading)}
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
          </Box>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />

          {loading && rangeCards.length === 0 ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Selected Range Metrics
              </Typography>
              {[1, 2, 3, 4, 5].map(i => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Box sx={{ 
                    width: '100px', 
                    height: '16px', 
                    bgcolor: 'rgba(0,0,0,0.12)', 
                    borderRadius: 1 
                  }} />
                  <Box sx={{ 
                    width: '80px', 
                    height: '20px', 
                    bgcolor: 'rgba(0,0,0,0.12)', 
                    borderRadius: 1 
                  }} />
                </Box>
              ))}
            </Box>
          ) : (
            rangeCards.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Selected Range Metrics
                </Typography>
                <Grid container spacing={2}>
                  {rangeCards.map(card => (
                    <Grid key={card.title} sx={{ mb: 1, gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 2.4' } }}>
                      {renderMetricRow(card.title, card.value, loading)}
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tokens Over Time
            </Typography>
          </Box>

          <ProgressiveGraph
            startDate={startDate}
            endDate={endDate}
            granularity={granularity}
            metric={metric}
          />
        </>
      )}
    </>
  );
};

export default DashboardStats;
