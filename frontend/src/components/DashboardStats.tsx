import React, { useState, useEffect } from "react";
import { Box, Grid, Typography } from "@mui/material";
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

const DashboardStats: React.FC = () => {
  const [lifetimeMetrics, setLifetimeMetrics] = useState<Metrics | null>(null);
  const [rangeMetrics, setRangeMetrics] = useState<Metrics | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [granularity, setGranularity] = useState<
    "hourly" | "daily" | "weekly" | "monthly"
  >("daily");
  const [metric, setMetric] = useState<
    | "total_tokens"
    | "input_tokens"
    | "output_tokens"
    | "requests"
    | "tokens_per_sec"
  >("total_tokens");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLifetimeMetrics(), fetchRangeMetrics()]);
      setLoading(false);
    };
    loadData();
  }, [startDate, endDate]);

  return (
    <>
      <MetricsSection
        title="Lifetime Metrics"
        total_tokens={lifetimeMetrics?.total_tokens}
        total_input_tokens={lifetimeMetrics?.total_input_tokens}
        total_output_tokens={lifetimeMetrics?.total_output_tokens}
        tokens_per_sec={lifetimeMetrics?.tokens_per_sec}
        request_count={lifetimeMetrics?.request_count}
      />

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

      <MetricsSection
        title="Selected Range Metrics"
        total_tokens={rangeMetrics?.total_tokens}
        total_input_tokens={rangeMetrics?.total_input_tokens}
        total_output_tokens={rangeMetrics?.total_output_tokens}
        tokens_per_sec={rangeMetrics?.tokens_per_sec}
        request_count={rangeMetrics?.request_count}
      />

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
  );
};

export default DashboardStats;
