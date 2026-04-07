import React, { useState, useEffect, useRef } from "react";
import { getRangeSeconds } from "../utils/granularity";
import { secondsToDisplayValue, displayValueToSeconds } from "../utils/granularityDisplay";
import { Box, Typography, Button, Chip } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import DateRangePicker from "./DateRangePicker";
import ProgressiveGraph from "./ProgressiveGraph";
import MetricsSection from "./MetricsSection";
import type { MetricType, GranularitySeconds } from "../types/metrics";

interface ProgressiveDataPoint {
  hasValue: boolean;
  timestamp: string;
  value: number;
}

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
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [granularity, setGranularity] = useState<GranularitySeconds>(60 * 60); // Default to 1 hour
  const [metric, setMetric] = useState<MetricType>("total_tokens");
  const [displayGranularity, setDisplayGranularity] = useState<string>("1h");

  const [graphData, setGraphData] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

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
    currentGranularitySeconds: GranularitySeconds,
    metric: string,
    onProgress: (data: ProgressiveDataPoint[], done: boolean) => void,
    signal: AbortSignal,
  ) => {
    const batchSize = 16;
    const rangeSeconds = getRangeSeconds(start, end);
    const dataPointCount = Math.ceil(rangeSeconds / currentGranularitySeconds) + 1;
    const batchCount = Math.ceil(dataPointCount / batchSize);
    const displayValue = secondsToDisplayValue(currentGranularitySeconds) || "1h";
    const allData: ProgressiveDataPoint[] = new Array(dataPointCount).fill({
      hasValue: false,
      timestamp: "",
      value: 0,
    });
    // set blank
    onProgress([...allData], false);

    for (
      let batchIndex = batchCount - 1;
      batchIndex >= 0 && !signal.aborted;
      batchIndex--
    ) {
      try {
        const response = await fetch(
          `/api/metrics/progressive?start=${start.toISOString()}&end=${end.toISOString()}&granularity=${displayValue}&metric=${metric}&batchIndex=${batchIndex}&batchSize=${batchSize}`,
          { signal },
        );

        if (response.ok) {
          const data: ProgressiveDataPoint[] = await response.json();
          const startIndex = batchIndex * batchSize;
          for (
            let i = 0;
            i < data.length && startIndex + i < allData.length;
            i++
          ) {
            allData[startIndex + i] = data[i];
          }
          const progress = Math.round(
            ((batchCount - batchIndex) / batchCount) * 100,
          );
          onProgress([...allData], false);
          setLoadingProgress(progress);
        } else {
          console.error(
            `Batch ${batchIndex} failed with status:`,
            response.status,
          );
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Request cancelled, stopping fetch");
          return;
        }
        console.error(`Error fetching batch ${batchIndex}:`, error);
      }
    }

    if (!signal.aborted) {
      onProgress(
        allData.filter((d) => d.timestamp !== ""),
        true,
      );
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

  const handleMetricChange = (val: MetricType) => {
    setMetric(val);
    setGraphData([]);
  };

  const handleGranularityChange = (value: string) => {
    const seconds = displayValueToSeconds(value);
    if (seconds) {
      setGranularity(seconds);
    }
  };

  const handleGraphRefresh = async () => {
    if (!startDate || !endDate) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      setGraphLoading(true);
      setLoadingProgress(0);

      await fetchGraphDataProgressive(
        startDate,
        endDate,
        granularity,
        metric,
        (data, done) => {
          setGraphData(data);
          if (done) {
            setGraphLoading(false);
            setLoadingProgress(100);
            setTimeout(() => setLoadingProgress(0), 500);
            abortControllerRef.current = null;
          }
        },
        newAbortController.signal,
      );
    }, 300);
  };

  useEffect(() => {
    fetchLifetimeMetrics();
    fetchRangeMetrics();
  }, []);

  useEffect(() => {
    // Sync display granularity with seconds value
    const displayValue = secondsToDisplayValue(granularity);
    if (displayValue) {
      setDisplayGranularity(displayValue);
    }
  }, [granularity]);

  useEffect(() => {
    if (startDate && endDate) {
      handleGraphRefresh();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startDate, endDate, granularity, metric]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
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

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6">Time Range Metrics</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
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

<DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(date) => {
          setStartDate(date);
          handleGraphRefresh();
        }}
        onEndDateChange={(date) => {
          setEndDate(date);
          handleGraphRefresh();
        }}
        onRefresh={handleGraphRefresh}
        onGranularityChange={(seconds) => {
          setGranularity(seconds);
        }}
      />

      <MetricsSection
        total_tokens={rangeMetrics?.total_tokens}
        total_input_tokens={rangeMetrics?.total_input_tokens}
        total_output_tokens={rangeMetrics?.total_output_tokens}
        tokens_per_sec={rangeMetrics?.tokens_per_sec}
        request_count={rangeMetrics?.request_count}
      />

      <ProgressiveGraph
        data={graphData}
        granularity={displayGranularity}
        metric={metric}
        loading={graphLoading}
        loadingProgress={loadingProgress}
        onGranularityChange={handleGranularityChange}
        onMetricChange={(value) => handleMetricChange(value)}
      />

    </>
  );
};

export default DashboardStats;
