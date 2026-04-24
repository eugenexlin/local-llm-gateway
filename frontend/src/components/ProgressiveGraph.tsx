import React, { useMemo } from "react";
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
  useMediaQuery,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
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
  Legend,
} from "recharts";
import { metricLabels } from "../utils/metricsLabels";
import { getAllGranularityOptions } from "../utils/granularityDisplay";
import type {
  GranularitySeconds,
  MetricType,
  ProgressiveDataPoint,
  BarGrouping,
} from "../types/metrics";
import { formatValue } from "../utils/formatValue";
import { ChartTooltip } from "./InsightsGraph";

export type UserGraphData = Record<string, ProgressiveDataPoint[]>;

const USER_COLORS = [
  "#1976d2",
  "#d32f2f",
  "#388e3c",
  "#f57c00",
  "#7b1fa2",
  "#0097a7",
  "#c2185b",
  "#43a047",
  "#e64a19",
  "#5e35b1",
];

function getUserColor(_userId: string, index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

function getUserLabel(
  userId: string,
  _userOptions: { id: string; name?: string; email?: string }[],
): string {
  const user = _userOptions.find((u: { id: string; name?: string; email?: string }) => u.id === userId);
  return user?.name || user?.email || userId.substring(0, 8);
}

interface TransformedDataPoint {
  timestamp: string;
  [key: string]: number | null | string;
}

function transformUserGraphData(
  userGraphData: UserGraphData,
  _userOptions: { id: string; name?: string; email?: string }[],
): { transformedData: TransformedDataPoint[]; userKeys: string[] } {
  const users = Object.keys(userGraphData);
  if (users.length === 0) {
    return { transformedData: [], userKeys: [] };
  }

  const baseData = userGraphData[users[0]];
  const transformedData: TransformedDataPoint[] = baseData.map((_, index) => {
    const point: TransformedDataPoint = {
      timestamp: baseData[index].timestamp,
    };

    for (const userId of users) {
      const userKey = `__user_${userId}`;
      const userPoint = userGraphData[userId][index];
      point[userKey] = userPoint.hasValue ? userPoint.value : null;
    }

    return point;
  });

  const userKeys = users.map((userId) => `__user_${userId}`);

  return { transformedData, userKeys };
}

interface ProgressiveGraphProps {
  data: ProgressiveDataPoint[];
  granularity: string; // Display value (e.g., "1h")
  granularitySeconds: GranularitySeconds;
  metric: MetricType;
  loading: boolean;
  loadingProgress: number;
  onGranularityChange?: (value: string) => void;
  onMetricChange?: (metric: MetricType) => void;
  barGrouping?: BarGrouping;
  onBarGroupingChange?: (grouping: BarGrouping) => void;
  userGraphData?: UserGraphData;
  userOptions?: { id: string; name?: string; email?: string }[];
}

const isRateMetric = (metric: MetricType): boolean => {
  return (
    metric === "tokens_per_sec" ||
    metric === "input_tokens_per_sec" ||
    metric === "output_tokens_per_sec"
  );
};

function calculateTickSpacing(
  dataLength: number,
  minTicks: number = 6,
): number {
  if (dataLength <= minTicks) {
    return 0;
  }
  const targetTicks = minTicks;
  let divide = 1;
  while (dataLength / divide > targetTicks) {
    divide *= 2;
  }
  return divide / 2;
}

interface CustomGridProps {
  tickSpacing: number;
  dataLength: number;
}

const CustomVerticalGrid: React.FC<CustomGridProps> = ({
  tickSpacing: _tickSpacing,
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

const formatXAxisTimestamp = (
  timestamp: string,
  secondsPerTick: number,
): string => {
  const date = new Date(timestamp);

  if (secondsPerTick <= 3600) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (secondsPerTick <= 86400) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
};

const ProgressiveGraph: React.FC<ProgressiveGraphProps> = ({
  data,
  granularity,
  granularitySeconds,
  metric,
  loading,
  loadingProgress,
  onGranularityChange,
  onMetricChange,
  barGrouping = "side-by-side",
  onBarGroupingChange,
  userGraphData,
  userOptions = [],
}) => {
  const hasMultipleUsers =
    userGraphData && Object.keys(userGraphData).length > 1;

  const { transformedData, userKeys } = useMemo(() => {
    if (hasMultipleUsers && userGraphData) {
      return transformUserGraphData(userGraphData, userOptions);
    }
    return {
      transformedData: [] as TransformedDataPoint[],
      userKeys: [] as string[],
    };
  }, [hasMultipleUsers, userGraphData, userOptions]);

  const displayData = hasMultipleUsers
    ? (transformedData as unknown as ProgressiveDataPoint[])
    : data;
  const displayLength = data.length;
  const granularityOptions = getAllGranularityOptions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const minimumTicks = isMobile ? 2 : isTablet ? 4 : 6;

  const handleGranularityChange = (event: SelectChangeEvent<string>) => {
    if (onGranularityChange) {
      onGranularityChange(event.target.value);
    }
  };

  const handleMetricChange = (event: SelectChangeEvent<string>) => {
    if (onMetricChange) {
      onMetricChange(event.target.value as MetricType);
    }
  };

  const dataPointsPerTick = calculateTickSpacing(displayLength, minimumTicks);
  const totalSecondsPerTick = (dataPointsPerTick + 1) * granularitySeconds;

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

        {hasMultipleUsers && (
          <ToggleButtonGroup
            value={barGrouping}
            exclusive
            onChange={(_, newValue: BarGrouping) => {
              if (newValue) onBarGroupingChange?.(newValue);
            }}
            size="small"
          >
            <ToggleButton value="side-by-side">Side by Side</ToggleButton>
            <ToggleButton value="stacked">Stacked</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {data.length > 0 && (
        <Box sx={{ position: "relative", height: 300 }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 80,
                height: 40,
                display: "flex",
                alignItems: "center",
                px: 2,
                zIndex: 10,
                background: "rgba(255, 255, 255, 0.5)",
                borderRadius: 1,
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
              <LineChart data={displayData}>
                {hasMultipleUsers && (
                  <Legend
                    formatter={(
                      value: string,
                      entry: { color?: string; payload?: { label?: string } },
                    ) => {
                      const label = entry.payload?.label || value;
                      return (
                        <span style={{ color: entry.color || "#000" }}>
                          {label}
                        </span>
                      );
                    }}
                  />
                )}
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  niceTicks="auto"
                  interval={dataPointsPerTick}
                  tickFormatter={(value, _index) =>
                    formatXAxisTimestamp(value, totalSecondsPerTick)
                  }
                  domain={[
                    displayLength > 0 ? displayData[0].timestamp : "auto",
                    displayLength > 0
                      ? displayData[displayLength - 1].timestamp
                      : "auto",
                  ]}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatValue(value)}
                />
                <Tooltip
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const entry = payload[0];
                      const timestamp = entry.payload?.timestamp;

                      const rows = payload.map((p) => {
                        const key = Object.keys(entry.payload || {}).find(
                          (k) => k !== "timestamp",
                        );
                        const userIndex = key ? userKeys.indexOf(key) : -1;
                        const userId =
                          userIndex >= 0
                            ? userOptions[userIndex]?.id
                            : key;
                        const label = hasMultipleUsers && userId
                          ? getUserLabel(userId, userOptions)
                          : metricLabels[metric];
                        return {
                          label,
                          value:
                            typeof p.value === "number"
                              ? Math.round(p.value).toLocaleString()
                              : "N/A",
                        };
                      });

                      return (
                        <ChartTooltip
                          timestamp={timestamp}
                          rows={rows}
                        />
                      );
                    }
                    return null;
                  }}
                />
                {hasMultipleUsers ? (
                  userKeys.map((userKey, index) => {
                    const userId =
                      userOptions[index]?.id || userKey.replace("__user_", "");
                    const color = getUserColor(userId, index);
                    const label = getUserLabel(userId, userOptions);
                    return (
                      <Line
                        key={userKey}
                        type="monotone"
                        dataKey={userKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: color,
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        connectNulls={true}
                        isAnimationActive={false}
                        name={label}
                      />
                    );
                  })
                ) : (
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
                )}
              </LineChart>
            ) : (
              <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                <CustomVerticalGrid
                  tickSpacing={calculateTickSpacing(displayLength)}
                  dataLength={displayLength}
                />
                <BarChart data={displayData} barGap={0} barCategoryGap={'10%'}>
                  {hasMultipleUsers && (
                    <Legend
                      formatter={(
                        value: string,
                        entry: { color?: string; payload?: { label?: string } },
                      ) => {
                        const label = entry.payload?.label || value;
                        return (
                          <span style={{ color: entry.color || "#000" }}>
                            {label}
                          </span>
                        );
                      }}
                    />
                  )}
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    niceTicks="auto"
                    interval={dataPointsPerTick}
tickFormatter={(value, _index) =>
                      formatXAxisTimestamp(value, totalSecondsPerTick)
                    }
                    domain={[
                      displayLength > 0 ? displayData[0].timestamp : "auto",
                      displayLength > 0
                        ? displayData[displayLength - 1].timestamp
                        : "auto",
                    ]}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatValue(value)}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const entry = payload[0];
                        const timestamp = entry.payload?.timestamp;

                        const rows = payload.map((p) => {
                          const key = Object.keys(entry.payload || {}).find(
                            (k) => k !== "timestamp",
                          );
                          const userIndex = key ? userKeys.indexOf(key) : -1;
                          const userId =
                            userIndex >= 0
                              ? userOptions[userIndex]?.id
                              : key;
                          const label = hasMultipleUsers && userId
                            ? getUserLabel(userId, userOptions)
                            : metricLabels[metric];
                          return {
                            label,
                            value:
                              typeof p.value === "number"
                                ? Math.round(p.value).toLocaleString()
                                : "N/A",
                          };
                        });

                        return (
                          <ChartTooltip
                            timestamp={timestamp}
                            rows={rows}
                          />
                        );
                      }
                      return null;
                    }}
                  />
                  {hasMultipleUsers ? (
                    userKeys.map((userKey, index) => {
                      const userId =
                        userOptions[index]?.id ||
                        userKey.replace("__user_", "");
                      const color = getUserColor(userId, index);
                      const label = getUserLabel(userId, userOptions);
                      return (
                        <Bar
                          key={userKey}
                          dataKey={userKey}
                          fill={color}
                          isAnimationActive={false}
                          name={label}
                          stackId={
                            barGrouping === "stacked" ? "user" : undefined
                          }
                        />
                      );
                    })
                  ) : (
                    <Bar
                      dataKey="value"
                      fill="#1976d2"
                      isAnimationActive={false}
                    />
                  )}
                </BarChart>
              </Box>
            )}
          </ResponsiveContainer>
        </Box>
      )}

      {data.length === 0 && !loading && (
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
