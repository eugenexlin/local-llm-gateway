import React, { useState, useEffect } from "react";
 import { Box, Grid, Typography, Button, CircularProgress, Chip } from "@mui/material";
 import { Refresh } from "@mui/icons-material";
 import DateRangePicker from "./DateRangePicker";
 import ProgressiveGraph from "./ProgressiveGraph";
 import MetricsSection from "./MetricsSection";

interface Metrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  request_count: number;
}

const autoSelectGranularity = (start: Date, end: Date): "5min" | "15min" | "hourly" | "daily" | "weekly" | "monthly" => {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 1) return "5min";
  if (diffDays <= 7) return "15min";
  if (diffDays <= 30) return "hourly";
  if (diffDays <= 90) return "daily";
  if (diffDays <= 365) return "weekly";
  return "monthly";
};

const DashboardStats: React.FC = () => {
  const [lifetimeMetrics, setLifetimeMetrics] = useState<Metrics | null>(null);
  const [rangeMetrics, setRangeMetrics] = useState<Metrics | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [granularity, setGranularity] = useState<
    "5min" | "15min" | "hourly" | "daily" | "weekly" | "monthly"
  >("hourly");
  const [metric, setMetric] = useState<
    | "total_tokens"
    | "input_tokens"
    | "output_tokens"
    | "requests"
    | "tokens_per_sec"
  >("total_tokens");
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  const fetchLifetimeMetrics = async () => {
    try {
      const response = await fetch("/api/metrics/lifetime");
      if (response.ok) {
        const data = await response.json();
        setLifetimeMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching lifetime metrics:", error);
    }
  };

  const fetchRangeMetrics = async () => {
    if (!startDate || !endDate) return;

    try {
      const response = await fetch(
        `/api/metrics/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setRangeMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching range metrics:", error);
    }
  };

  const fetchGraphDataProgressive = async (
  start: Date, 
  end: Date, 
  currentGranularity: typeof granularity,
  metric: typeof metric,
  onProgress: (data: ProgressiveDataPoint[], done: boolean) => void
) => {
  const tickSizeMs = {
    "5min": 5 * 60 * 1000,
    "15min": 15 * 60 * 1000,
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  }[currentGranularity];
  
  const batchSize = 8;
  let allData: ProgressiveDataPoint[] = [];
  let currentTime = start.getTime();
  
  while (currentTime < end.getTime()) {
    const batchEnd = Math.min(currentTime + tickSizeMs * batchSize, end.getTime());
    
    try {
      const response = await fetch(
        `/api/metrics/progressive?start=${new Date(currentTime).toISOString()}&end=${new Date(batchEnd).toISOString()}&granularity=${currentGranularity}&metric=${metric}`
      );
      
      if (response.ok) {
        const data: ProgressiveDataPoint[] = await response.json();
        allData = [...allData, ...data];
      }
    } catch (error) {
      console.error('Error fetching batch:', error);
    }
    
    currentTime += tickSizeMs * batchSize;
    onProgress(allData, currentTime >= end.getTime());
  }
};

const handleRefreshLifetime = async () => {
  try {
    await fetchLifetimeMetrics();
  } catch (error) {
    console.error("Error fetching lifetime metrics:", error);
  }
};

const handleRefreshRange = async () => {
  try {
    await fetchRangeMetrics();
  } catch (error) {
    console.error("Error fetching range metrics:", error);
  }
};

const handleGraphRefresh = async () => {
  if (!startDate || !endDate) return;
  
  setGraphLoading(true);
  setGraphData([]);
  
  const selectedGranularity = autoSelectGranularity(startDate, endDate);
  setGranularity(selectedGranularity);
  
  await fetchGraphDataProgressive(
    startDate,
    endDate,
    selectedGranularity,
    metric,
    (data, done) => {
      setGraphData(data);
      if (done) {
        setGraphLoading(false);
      }
    }
  );
};

useEffect(() => {
  if (startDate && endDate) {
    handleGraphRefresh();
  }
}, [startDate, endDate, granularity, metric]);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Lifetime Metrics</Typography>
        <Button
          onClick={handleRefreshLifetime}
          size="small"
          startIcon={<Refresh />}
        >
          Refresh
        </Button>
      </Box>
      <MetricsSection
        total_tokens={lifetimeMetrics?.total_tokens}
        total_input_tokens={lifetimeMetrics?.total_input_tokens}
        total_output_tokens={lifetimeMetrics?.total_output_tokens}
        tokens_per_sec={lifetimeMetrics?.tokens_per_sec}
        request_count={lifetimeMetrics?.request_count}
      />

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Time Range Metrics</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {graphLoading && (
            <Chip 
              label="Loading graph..." 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
          <Button
            onClick={handleRefreshRange}
            size="small"
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <MetricsSection
        total_tokens={rangeMetrics?.total_tokens}
        total_input_tokens={rangeMetrics?.total_input_tokens}
        total_output_tokens={rangeMetrics?.total_output_tokens}
        tokens_per_sec={rangeMetrics?.tokens_per_sec}
        request_count={rangeMetrics?.request_count}
      />

      <ProgressiveGraph
        data={graphData}
        granularity={granularity}
        metric={metric}
        loading={graphLoading}
      />
    </>
  );
};

export default DashboardStats;
