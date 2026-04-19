import React, { useState, useEffect, useRef } from "react";
import { getRangeSeconds } from "../utils/granularity";
import {
  secondsToDisplayValue,
  displayValueToSeconds,
} from "../utils/granularityDisplay";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import {
  Refresh,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FirstPage,
  LastPage,
  Settings,
} from "@mui/icons-material";
import DateRangePicker from "./DateRangePicker";
import ProgressiveGraph from "./ProgressiveGraph";
import MetricsSection from "./MetricsSection";
import UserFilter from "./UserFilter";
import InsightsGraph from "./InsightsGraph";
import SettingsModal from "./SettingsModal";
import {
  getCacheSize,
  clearCache,
  getCacheEnabled,
  setCacheEnabled,
  writeCache,
  mergeCachedData,
} from "../utils/dataCache";
import { useAuth } from "../context/AuthContext";
import type {
  MetricType,
  GranularitySeconds,
  InsightsConfig,
  ProgressiveDataPoint,
} from "../types/metrics";

interface Metrics {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  tokens_per_sec: number;
  input_tokens_per_sec: number;
  output_tokens_per_sec: number;
  request_count: number;
}

const DashboardStats: React.FC = () => {
  const { user } = useAuth();
  const [lifetimeMetrics, setLifetimeMetrics] = useState<Metrics | null>(null);
  const [rangeMetrics, setRangeMetrics] = useState<Metrics | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [granularity, setGranularity] = useState<GranularitySeconds>(60 * 60);
  const [metric, setMetric] = useState<MetricType>("total_tokens");
  const [displayGranularity, setDisplayGranularity] = useState<string>("1h");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    user?.id || null,
  );
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);

  const [graphData, setGraphData] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const [cacheEnabled, setCacheEnabledState] = useState(getCacheEnabled());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [insightsConfig, setInsightsConfig] = useState<InsightsConfig>({
    xAxis: null,
    yAxis: null,
    viewMode: "scatter",
  });

  const fetchLifetimeMetrics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedUserId && selectedUserId !== "all") {
        params.append("userId", selectedUserId);
        if (selectedApiKeyId) {
          params.append("apiKeyId", selectedApiKeyId);
        }
      }
      const response = await fetch(
        `/api/metrics/lifetime${params.toString() ? `?${params.toString()}` : ""}`,
      );
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
      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      if (selectedUserId && selectedUserId !== "all") {
        params.append("userId", selectedUserId);
        if (selectedApiKeyId) {
          params.append("apiKeyId", selectedApiKeyId);
        }
      }
      const response = await fetch(`/api/metrics/range?${params.toString()}`);
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
    const dataPointCount =
      Math.ceil(rangeSeconds / currentGranularitySeconds) + 1;
    const batchCount = Math.ceil(dataPointCount / batchSize);
    const displayValue =
      secondsToDisplayValue(currentGranularitySeconds) || "1h";

    const templateParams = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      granularity: displayValue,
    });
    if (selectedUserId && selectedUserId !== "all") {
      templateParams.append("userId", selectedUserId);
      if (selectedApiKeyId) {
        templateParams.append("apiKeyId", selectedApiKeyId);
      }
    }

    try {
      const templateResponse = await fetch(
        `/api/metrics/timestamps?${templateParams.toString()}`,
        { signal },
      );

      if (!templateResponse.ok) {
        throw new Error("Failed to fetch timestamp template");
      }

      const templateData: ProgressiveDataPoint[] =
        await templateResponse.json();
      const allData: ProgressiveDataPoint[] = templateData.map((point) => ({
        ...point,
        value: null,
        hasValue: false,
      }));

      if (cacheEnabled) {
        mergeCachedData(allData, currentGranularitySeconds, metric);
      }

      const allFilled = !allData.some((point) => !point.hasValue);

      if (allFilled) {
        onProgress([...allData], true);
        return;
      }

      // cache did not fill, start loading
      setGraphLoading(true);
      setLoadingProgress(0);

      onProgress([...allData], false);

      let batchesCompleted = 0;

      for (
        let batchIndex = batchCount - 1;
        batchIndex >= 0 && !signal.aborted;
        batchIndex--
      ) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, allData.length);

        if (cacheEnabled) {
        const allCached = allData
             .slice(startIndex, endIndex)
             .every((point) => point.hasValue);
          if (allCached) {
            batchesCompleted++;
            continue;
          }
        }

        try {
          const params = new URLSearchParams({
            start: start.toISOString(),
            end: end.toISOString(),
            granularity: displayValue,
            metric: metric,
            batchIndex: String(batchIndex),
            batchSize: String(batchSize),
          });
          if (selectedUserId && selectedUserId !== "all") {
            params.append("userId", selectedUserId);
            if (selectedApiKeyId) {
              params.append("apiKeyId", selectedApiKeyId);
            }
          }
          const response = await fetch(
            `/api/metrics/progressive?${params.toString()}`,
            { signal },
          );

          if (response.ok) {
            const data: ProgressiveDataPoint[] = await response.json();
            for (
              let i = 0;
              i < data.length && startIndex + i < allData.length;
              i++
            ) {
              allData[startIndex + i] = data[i];
            }
            if (cacheEnabled) {
              writeCache(data, currentGranularitySeconds, metric);
            }
            batchesCompleted++;
            const progress = Math.round((batchesCompleted / batchCount) * 100);
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
        onProgress(allData, true);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error fetching timestamp template:", error);
      }
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

  const handleScroll = (direction: "left" | "right", step: "full" | "half") => {
    if (!startDate || !endDate) return;
    const windowMs = endDate.getTime() - startDate.getTime();
    const stepMs = step === "full" ? windowMs : windowMs / 2;
    const shift = direction === "left" ? -stepMs : stepMs;
    setStartDate(new Date(startDate.getTime() + shift));
    setEndDate(new Date(endDate.getTime() + shift));
  };

  const handleToggleCache = (enabled: boolean) => {
    setCacheEnabledState(enabled);
    setCacheEnabled(enabled);
  };

  const handlePurgeCache = () => {
    clearCache();
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
    if (selectedUserId) {
      fetchLifetimeMetrics();
      fetchRangeMetrics();
    }
  }, [selectedUserId, selectedApiKeyId]);

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
  }, [
    startDate,
    endDate,
    granularity,
    metric,
    selectedUserId,
    selectedApiKeyId,
  ]);

  return (
    <>
      <UserFilter
        currentUser={user}
        selectedUserId={selectedUserId}
        onUserChange={(userId) => {
          setSelectedUserId(userId);
          setSelectedApiKeyId(null);
        }}
        selectedApiKeyId={selectedApiKeyId}
        onApiKeyChange={setSelectedApiKeyId}
      />

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
        input_tokens_per_sec={lifetimeMetrics?.input_tokens_per_sec}
        output_tokens_per_sec={lifetimeMetrics?.output_tokens_per_sec}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>
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
        onGranularityChange={(seconds) => {
          setGranularity(seconds);
        }}
      />

      <MetricsSection
        total_tokens={rangeMetrics?.total_tokens}
        total_input_tokens={rangeMetrics?.total_input_tokens}
        total_output_tokens={rangeMetrics?.total_output_tokens}
        tokens_per_sec={rangeMetrics?.tokens_per_sec}
        input_tokens_per_sec={rangeMetrics?.input_tokens_per_sec}
        output_tokens_per_sec={rangeMetrics?.output_tokens_per_sec}
        request_count={rangeMetrics?.request_count}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Box />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {graphData.length > 0 && (
            <>
              <Tooltip title="Jump to start">
                <IconButton
                  size="small"
                  onClick={() => handleScroll("left", "full")}
                >
                  <FirstPage />
                </IconButton>
              </Tooltip>
              <Tooltip title="Scroll left half window">
                <IconButton
                  size="small"
                  onClick={() => handleScroll("left", "half")}
                >
                  <KeyboardArrowLeft />
                </IconButton>
              </Tooltip>
              <Tooltip title="Scroll right half window">
                <IconButton
                  size="small"
                  onClick={() => handleScroll("right", "half")}
                >
                  <KeyboardArrowRight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Jump to end">
                <IconButton
                  size="small"
                  onClick={() => handleScroll("right", "full")}
                >
                  <LastPage />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
      <ProgressiveGraph
        data={graphData}
        granularity={displayGranularity}
        granularitySeconds={granularity}
        metric={metric}
        loading={graphLoading}
        loadingProgress={loadingProgress}
        onGranularityChange={handleGranularityChange}
        onMetricChange={(value) => handleMetricChange(value)}
      />

      <InsightsGraph
        startDate={startDate}
        endDate={endDate}
        userId={selectedUserId || undefined}
        apiKeyId={selectedApiKeyId || undefined}
        config={insightsConfig}
        onConfigChange={setInsightsConfig}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cacheEnabled={cacheEnabled}
        onToggleCache={handleToggleCache}
        cacheSize={getCacheSize()}
        onPurge={handlePurgeCache}
      />
    </>
  );
};

export default DashboardStats;
