import React from "react";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { metricLabels } from "../utils/metricsLabels";
import { getAllGranularityOptions } from "../utils/granularityDisplay";
import type { MetricType } from "../types/metrics";

export interface ProgressiveDataPoint {
  hasValue: boolean;
  timestamp: string;
  value: number | null;
}

interface ProgressiveGraphProps {
  data: ProgressiveDataPoint[];
  granularity: string; // Display value (e.g., "1h")
  metric: MetricType;
  loading: boolean;
  loadingProgress: number;
  onGranularityChange?: (value: string) => void;
  onMetricChange?: (metric: MetricType) => void;
}

const isRateMetric = (metric: MetricType): boolean => {
  return (
    metric === "tokens_per_sec" ||
    metric === "input_tokens_per_sec" ||
    metric === "output_tokens_per_sec"
  );
};

function calculateTickSpacing(dataLength: number): number {
  if (dataLength <= 8) {
    return 1;
  }
  const targetTicks = 6;
  let divide = 1;
  while (dataLength / divide > targetTicks) {
    divide *= 2;
  }
  return divide;
}

interface CustomGridProps {
  tickSpacing: number;
  dataLength: number;
}

const CustomVerticalGrid: React.FC<CustomGridProps> = ({
  tickSpacing,
  dataLength,
}) => {
  if (dataLength <= 1) return null;

  const gridLines: React.CSSProperties[] = [];

  for (let i = 0; i < dataLength; i++) {
    const percentage = (i / (dataLength - 1)) * 100;
    gridLines.push({
      left: `${percentage}%`,
      position: "absolute" as const,
      width: "1px",
      height: "100%",
      background: "rgba(0, 0, 0, 0.1)",
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      {gridLines.map((style, index) => (
        <div key={index} style={style} />
      ))}
    </div>
  );
};

const ProgressiveGraph: React.FC<ProgressiveGraphProps> = ({
  data,
  granularity,
  metric,
  loading,
  loadingProgress,
  onGranularityChange,
  onMetricChange,
}) => {
  const tickSpacingRef = React.useRef<number>(1);
  const fullDataLength = data.length;
  const granularityOptions = getAllGranularityOptions();

  React.useEffect(() => {
    tickSpacingRef.current = calculateTickSpacing(fullDataLength);
  }, [fullDataLength]);

  const handleGranularityChange = (event: SelectChangeEvent<string>) => {
    if (onGranularityChange) {
      onGranularityChange(event.target.value);
    }
  };

  const handleMetricChange = (event: SelectChangeEvent<string>) => {
    if (onMetricChange) {
      onMetricChange(event.target.value);
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Metric</InputLabel>
          <Select value={metric} label="Metric" onChange={handleMetricChange}>
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
            onChange={handleGranularityChange}
          >
            {granularityOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {data.length > 0 && (
        <Box sx={{ position: "relative", height: 300 }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 80,
                right: 0,
                height: 40,
                display: "flex",
                alignItems: "center",
                pl: 2,
                zIndex: 10,
                background: "rgba(255, 255, 255, 0.9)",
              }}
            >
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Loading data... {Math.round(loadingProgress)}%
              </Typography>
            </Box>
          )}
          {loading && (
            <Box
              sx={{
                position: "absolute",
                bottom: 30,
                left: 64,
                right: 8,
                height: 4,
                zIndex: 11,
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${100 - loadingProgress}%`,
                  background:
                    "linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)",
                  transformOrigin: "right",
                  transition: "width 0.1s ease-out",
                }}
              />
            </Box>
          )}
          <ResponsiveContainer width="100%" height="100%">
            {isRateMetric(metric) ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  niceTicks="auto"
                  tickFormatter={(value, index) => {
                    const date = new Date(value);
                    if (
                      [
                        "5m",
                        "10m",
                        "15m",
                        "30m",
                        "1h",
                        "2h",
                        "4h",
                        "6h",
                        "12h",
                      ].includes(granularity)
                    ) {
                      return date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    }
                    if (granularity === "1d") {
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }
                    if (granularity === "1w") {
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      });
                    }
                    if (granularity === "1M") {
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      });
                    }
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number | undefined) => [
                    value !== undefined ? Math.round(value).toLocaleString() : "N/A",
                    metricLabels[metric],
                  ]}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return `Date: ${date.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#1976d2",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                <CustomVerticalGrid
                  tickSpacing={calculateTickSpacing(fullDataLength)}
                  dataLength={fullDataLength}
                />
                <BarChart data={data}>
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    niceTicks="auto"
                    tickFormatter={(value, index) => {
                      const date = new Date(value);

                      const granularitySeconds = granularityOptions.find(
                        (o) => o.value === granularity,
                      )?.seconds;
                      if (
                        granularitySeconds &&
                        granularitySeconds <= 12 * 60 * 60
                      ) {
                        // 12 hours or less - show time
                        return date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }
                      if (granularity === "1d") {
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      }
                      if (granularity === "1w" || granularity === "1M") {
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        });
                      }
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      value !== undefined ? Math.round(value).toLocaleString() : "0",
                      metricLabels[metric],
                    ]}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return `Date: ${date.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#1976d2"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </Box>
            )}
          </ResponsiveContainer>
        </Box>
      )}

      {data.length === 0 && fullDataLength === 0 && !loading && (
        <Box
          sx={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">
            No data available for the selected range
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ProgressiveGraph;
