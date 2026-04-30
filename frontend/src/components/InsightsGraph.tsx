import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";
import type {
  InsightsConfig,
  InsightsDataPoint,
  HeatMapDataPoint,
  AxisType,
  PresetConfig,
} from "../types/metrics";
import { formatValue } from "../utils/formatValue";
import { USER_COLORS } from "../utils/colors";

const MAX_POINTS = 10000;

const AXIS_OPTIONS: { type: AxisType; label: string }[] = [
  { type: "prompt_tokens", label: "Input Tokens" },
  { type: "completion_tokens", label: "Output Tokens" },
  { type: "total_tokens", label: "Total Tokens" },
  { type: "duration_ms", label: "Duration (ms)" },
  { type: "tokens_per_sec", label: "Tokens/Sec" },
  { type: "input_tokens_per_sec", label: "Input Tokens/Sec" },
  { type: "output_tokens_per_sec", label: "Output Tokens/Sec" },
];

const PRESETS: PresetConfig[] = [
  {
    id: "performance",
    label: "Performance",
    xAxis: "prompt_tokens",
    yAxis: "tokens_per_sec",
    description: "Input tokens vs throughput",
  },
  {
    id: "cost",
    label: "Cost Analysis",
    xAxis: "total_tokens",
    yAxis: "duration_ms",
    description: "Token usage vs latency",
  },
  {
    id: "efficiency",
    label: "Efficiency",
    xAxis: "duration_ms",
    yAxis: "completion_tokens",
    description: "Latency vs output tokens",
  },
];

const getAxisLabel = (type: AxisType | null): string => {
  const option = AXIS_OPTIONS.find((opt) => opt.type === type);
  return option?.label || "";
};

const getXDataKey = (type: AxisType | null): string => {
  if (type === "timestamp") return "timestamp";
  return type || "timestamp";
};

const getYDataKey = (type: AxisType | null): string => {
  if (type === "timestamp") return "timestamp";
  return type || "timestamp";
};

const isDateTimeAxis = (type: AxisType | null): boolean => {
  return type === "timestamp";
};

interface InsightsGraphProps {
  startDate: Date | null;
  endDate: Date | null;
  userId?: string | null;
  apiKeyId?: string | null;
  config: InsightsConfig;
  onConfigChange: (config: InsightsConfig) => void;
  userOptions?: { id: string; name?: string; email?: string }[];
}

const HEATMAP_COLOR_STOPS = [
  "#e8f5e9",
  "#c8e6c9",
  "#a5d6a7",
  "#81c784",
  "#66bb6a",
  "#4caf50",
  "#43a047",
  "#388e3c",
  "#2e7d32",
  "#1b5e20",
];

interface ChartTooltipProps {
  timestamp?: string;
  title?: string;
  rows: { label: string; value: string }[];
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  timestamp,
  title,
  rows,
}) => {
  const formattedTimestamp = timestamp
    ? new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <div
      style={{
        background: "#fff",
        padding: "8px 12px",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        fontSize: "12px",
        lineHeight: 1.5,
      }}
    >
      {formattedTimestamp && (
        <div style={{ color: "#888", fontSize: "11px", marginBottom: "2px" }}>
          {formattedTimestamp}
        </div>
      )}
      {title && (
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{title}</div>
      )}
      {rows.map((row, i) => (
        <div key={i} style={{ color: "#333" }}>
          <span style={{ color: "#888" }}>{row.label}: </span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
};

function getHeatmapColor(count: number, maxCount: number): string {
  if (maxCount === 0) return HEATMAP_COLOR_STOPS[0];
  const ratio = Math.min(count / maxCount, 1);
  const index = Math.min(
    Math.floor(ratio * HEATMAP_COLOR_STOPS.length),
    HEATMAP_COLOR_STOPS.length - 1,
  );
  return HEATMAP_COLOR_STOPS[index];
}

interface HeatMapCellProps {
  x: number;
  y: number;
  count: number;
  maxCount: number;
  xScale: (val: number) => number;
  yScale: (val: number) => number;
  xDomain: [number, number];
  yDomain: [number, number];
  cellGap: number;
}

const HeatMapCell: React.FC<HeatMapCellProps> = ({
  x,
  y,
  count,
  maxCount,
  xScale,
  yScale,
  xDomain,
  yDomain,
  cellGap,
}) => {
  const rect = useRef<SVGRectElement>(null);

  const { width, height, x: rectX, y: rectY } = useMemo(() => {
    const [xMin, xMax] = xDomain;
    const [yMin, yMax] = yDomain;

    const pixelWidth = xScale(xMax) - xScale(xMin);
    const pixelHeight = yScale(yMax) - yScale(yMin);

    const cellWidth = pixelWidth / 30;
    const cellHeight = pixelHeight / 20;

    const gap = cellGap || Math.min(cellWidth, cellHeight) * 0.1;

    const rectW = Math.max(cellWidth - gap * 2, 1);
    const rectH = Math.max(cellHeight - gap * 2, 1);

    const centerX = xScale(x);
    const centerY = yScale(y);

    return {
      width: rectW,
      height: rectH,
      x: centerX - rectW / 2,
      y: centerY - rectH / 2,
    };
  }, [x, y, count, maxCount, xScale, yScale, xDomain, yDomain, cellGap]);

  return (
    <rect
      ref={rect}
      x={rectX}
      y={rectY}
      width={width}
      height={height}
      fill={getHeatmapColor(count, maxCount)}
      rx={2}
      ry={2}
    />
  );
};

function getUserColorIndex(
  userId: string,
  userOptions: { id: string; name?: string; email?: string }[],
): number {
  if (!userOptions) return 0;
  const index = userOptions.findIndex((u) => u.id === userId);
  return index >= 0 ? index : 0;
}

const InsightsGraph: React.FC<InsightsGraphProps> = ({
  startDate,
  endDate,
  userId,
  apiKeyId,
  config,
  onConfigChange,
  userOptions,
}) => {
  const [data, setData] = useState<InsightsDataPoint[] | null>(null);
  const [heatMapData, setHeatMapData] = useState<HeatMapDataPoint[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<InsightsDataPoint | null>(
    null,
  );
  const [logDetails, setLogDetails] = useState<any>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 400 });
  const [heatmapGrid, setHeatmapGrid] = useState({ gridWidth: 20, gridHeight: 15 });
 

  const userColorMap = useMemo(() => {
    if (!data || !userOptions) return new Map<string, string>();
    const colorMap = new Map<string, string>();
    const userOrder: string[] = [];

    for (const point of data) {
      if (point.user_id && !colorMap.has(point.user_id)) {
        const colorIndex = getUserColorIndex(point.user_id, userOptions);
        colorMap.set(
          point.user_id,
          USER_COLORS[colorIndex % USER_COLORS.length],
        );
        userOrder.push(point.user_id);
      }
    }

    return colorMap;
  }, [data, userOptions]);

  const hasUserData = data && data.some((d) => d.user_id);

  const fetchData = async () => {
    if (!config.xAxis || !config.yAxis || !startDate || !endDate) {
      setData(null);
      setHeatMapData(null);
      return;
    }

    setLoading(true);
    setWarning(null);

    try {
      const response = await fetch("/api/metrics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          userId: userId || undefined,
          apiKeyId: apiKeyId || undefined,
          limit: MAX_POINTS,
        }),
      });

      const result = await response.json();

      if (result.warning) {
        setWarning(result.warning);
      }

      if (config.viewMode === "scatter") {
        setData(result.data || []);
      } else {
        const heatResponse = await fetch("/api/metrics/insights/heatmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            xAxisType: config.xAxis,
            yAxisType: config.yAxis,
            userId: userId || undefined,
            apiKeyId: apiKeyId || undefined,
            gridWidth: heatmapGrid.gridWidth,
            gridHeight: heatmapGrid.gridHeight,
          }),
        });
        const heatResult = await heatResponse.json();
        setHeatMapData(heatResult.data || []);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [config, startDate, endDate, userId, apiKeyId]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setChartDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!heatMapData || heatMapData.length === 0) return;

    const aspectRatio = chartDimensions.width / chartDimensions.height;
    const targetBins = 300;

    let gridW = Math.round(Math.sqrt(targetBins * aspectRatio));
    let gridH = Math.round(Math.sqrt(targetBins / aspectRatio));

    gridW = Math.max(5, Math.min(40, gridW));
    gridH = Math.max(5, Math.min(30, gridH));

    const finalRatio = gridW / gridH;
    const idealRatio = aspectRatio;

    if (finalRatio > idealRatio && gridH > 5) {
      gridH = Math.max(5, gridH - 1);
    } else if (finalRatio < idealRatio && gridW < 40) {
      gridW = Math.min(40, gridW + 1);
    }

    setHeatmapGrid({ gridWidth: gridW, gridHeight: gridH });
  }, [heatMapData, chartDimensions]);

  const handlePresetChange = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onConfigChange({
        ...config,
        presetId: preset.id,
        xAxis: preset.xAxis,
        yAxis: preset.yAxis,
      });
    }
  };

  const handleXAxisChange = (type: AxisType) => {
    onConfigChange({ ...config, xAxis: type, presetId: undefined });
  };

  const handleYAxisChange = (type: AxisType) => {
    onConfigChange({ ...config, yAxis: type, presetId: undefined });
  };

  const handleViewModeChange = (
    _: React.MouseEvent<HTMLElement>,
    mode: "scatter" | "heatmap" | null,
  ) => {
    if (mode === "scatter" || mode === "heatmap") {
      onConfigChange({ ...config, viewMode: mode });
    }
  };

  const handlePointClick = async (point: any) => {
    if (point && point.payload) {
      setSelectedPoint(point.payload);
      try {
        const response = await fetch(
          `/api/metrics/insights/log/${point.payload.id}`,
          { credentials: "include" },
        );
        if (response.ok) {
          const details = await response.json();
          setLogDetails(details);
        }
      } catch (error) {
        console.error("Error fetching log details:", error);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedPoint(null);
    setLogDetails(null);
  };

  return (
    <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Usage Insights</Typography>
        {data && (
          <Chip
            label={`${data.length} points`}
            size="small"
            sx={{ bgcolor: "primary.main", color: "white" }}
          />
        )}
        {heatMapData && (
          <Chip
            label={`${heatMapData.length} bins`}
            size="small"
            sx={{ bgcolor: "success.main", color: "white" }}
          />
        )}

        <ToggleButtonGroup
          value={config.viewMode}
          onChange={handleViewModeChange}
          size="small"
        >
          <ToggleButton value="scatter">Scatter</ToggleButton>
          <ToggleButton value="heatmap">Heat Map</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Preset</InputLabel>
          <Select
            value={config.presetId || ""}
            label="Preset"
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            <MenuItem value="" disabled>
              <em>Custom</em>
            </MenuItem>
            {PRESETS.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>X-Axis</InputLabel>
          <Select
            value={config.xAxis || ""}
            label="X-Axis"
            onChange={(e) => handleXAxisChange(e.target.value as AxisType)}
          >
            {AXIS_OPTIONS.map((option) => (
              <MenuItem key={option.type} value={option.type}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Y-Axis</InputLabel>
          <Select
            value={config.yAxis || ""}
            label="Y-Axis"
            onChange={(e) => handleYAxisChange(e.target.value as AxisType)}
          >
            {AXIS_OPTIONS.map((option) => (
              <MenuItem key={option.type} value={option.type}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}

      {!config.xAxis || !config.yAxis ? (
        <Paper sx={{ height: 400, minHeight: 400, p: 4, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">
            Select X and Y axes to visualize usage data
          </Typography>
        </Paper>
      ) : loading ? (
        <Paper sx={{ height: 400, minHeight: 400, p: 4, textAlign: "center" }}>
          <CircularProgress />
        </Paper>
      ) : (
        <Paper key={config.viewMode} sx={{ height: 400, minHeight: 400 }}>
          <ResponsiveContainer>
            {config.viewMode === "scatter" ? (
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type={isDateTimeAxis(config.xAxis) ? ("time" as any) : "number"}
                  dataKey={getXDataKey(config.xAxis)}
                  name={getAxisLabel(config.xAxis)}
                  label={{
                    value: getAxisLabel(config.xAxis),
                    position: "insideBottom",
                    offset: -10,
                  }}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatValue(value as number)}
                />
                <YAxis
                  type="number"
                  dataKey={getYDataKey(config.yAxis)}
                  name={getAxisLabel(config.yAxis)}
                  label={{
                    value: getAxisLabel(config.yAxis),
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatValue(value as number)}
                />
                <Tooltip
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as InsightsDataPoint;
                      const userName =
                        data.user_name || data.user_email || "Unknown";
                      return (
                        <ChartTooltip
                          timestamp={data.timestamp}
                          title={userName}
                          rows={[
                            {
                              label: getAxisLabel(config.xAxis),
                              value: formatValue(Number(data[config.xAxis!])),
                            },
                            {
                              label: getAxisLabel(config.yAxis),
                              value: formatValue(Number(data[config.yAxis!])),
                            },
                          ]}
                        />
                      );
                    }
                    return null;
                  }}
                />
                {hasUserData ? (
                  Array.from(userColorMap.entries()).map(([userId, color]) => (
                    <Scatter
                      key={userId}
                      data={(data || []).filter((d) => d.user_id === userId)}
                      fill={color}
                      onClick={handlePointClick}
                      cursor="pointer"
                    />
                  ))
                ) : (
                  <Scatter
                    data={data || []}
                    fill="#8884d8"
                    onClick={handlePointClick}
                    cursor="pointer"
                  />
                )}
              </ScatterChart>
            ) : (
              <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}>
                <ResponsiveContainer>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={
                        heatMapData?.length
                          ? [
                              Math.min(...heatMapData.map((d) => d.x)),
                              Math.max(...heatMapData.map((d) => d.x)),
                            ]
                          : [0, 1]
                      }
                      label={{
                        value: getAxisLabel(config.xAxis),
                        position: "insideBottom",
                        offset: -10,
                      }}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatValue(value)}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      domain={
                        heatMapData?.length
                          ? [
                              Math.min(...heatMapData.map((d) => d.y)),
                              Math.max(...heatMapData.map((d) => d.y)),
                            ]
                          : [0, 1]
                      }
                      label={{
                        value: getAxisLabel(config.yAxis),
                        angle: -90,
                        position: "insideLeft",
                      }}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatValue(value)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload as HeatMapDataPoint;
                          return (
                            <ChartTooltip
                              title={`Count: ${point.count}`}
                              rows={[
                                {
                                  label: getAxisLabel(config.xAxis),
                                  value: formatValue(point.x),
                                },
                                {
                                  label: getAxisLabel(config.yAxis),
                                  value: formatValue(point.y),
                                },
                              ]}
                            />
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={heatMapData || []}
                      fill="#82ca9d"
                    >
                      {heatMapData?.map((point, index) => (
                        <HeatMapCell
                          key={index}
                          x={point.x}
                          y={point.y}
                          count={point.count}
                          maxCount={Math.max(...(heatMapData || []).map((d) => d.count))}
                          xScale={(value: number) => {
                            const data = heatMapData || [];
                            if (data.length === 0) return 0;
                            const xMin = Math.min(...data.map((d) => d.x));
                            const xMax = Math.max(...data.map((d) => d.x));
                            const chartWidth = chartDimensions.width - 40;
                            return ((value - xMin) / (xMax - xMin || 1)) * chartWidth;
                          }}
                          yScale={(value: number) => {
                            const data = heatMapData || [];
                            if (data.length === 0) return 0;
                            const yMin = Math.min(...data.map((d) => d.y));
                            const yMax = Math.max(...data.map((d) => d.y));
                            const chartHeight = chartDimensions.height - 40;
                            return chartHeight - ((value - yMin) / (yMax - yMin || 1)) * chartHeight;
                          }}
                          xDomain={[
                            Math.min(...(heatMapData || []).map((d) => d.x)),
                            Math.max(...(heatMapData || []).map((d) => d.x)),
                          ]}
                          yDomain={[
                            Math.min(...(heatMapData || []).map((d) => d.y)),
                            Math.max(...(heatMapData || []).map((d) => d.y)),
                          ]}
                          cellGap={2}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </ResponsiveContainer>
        </Paper>
      )}

      <Dialog
        open={!!selectedPoint}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Usage Log Details</DialogTitle>
        <DialogContent>
          {logDetails ? (
            <DialogContentText>
              <Box sx={{ mt: 2 }}>
                <p>
                  <strong>Log ID:</strong> {logDetails.id}
                </p>
                <p>
                  <strong>User:</strong> {logDetails.user_email || "N/A"}
                </p>
                {logDetails.api_key_name && (
                  <p>
                    <strong>API Key:</strong> {logDetails.api_key_name}
                  </p>
                )}
                <p>
                  <strong>Timestamp:</strong>{" "}
                  {new Date(logDetails.timestamp).toLocaleString()}
                </p>
                <p>
                  <strong>Input Tokens:</strong> {logDetails.prompt_tokens}
                </p>
                <p>
                  <strong>Output Tokens:</strong> {logDetails.completion_tokens}
                </p>
                <p>
                  <strong>Total Tokens:</strong> {logDetails.total_tokens}
                </p>
                <p>
                  <strong>Duration:</strong> {logDetails.duration_ms} ms
                </p>
                <p>
                  <strong>Cache Creation:</strong>{" "}
                  {logDetails.cache_creation_input_tokens || 0}
                </p>
                <p>
                  <strong>Cache Read:</strong>{" "}
                  {logDetails.cache_read_input_tokens || 0}
                </p>
              </Box>
            </DialogContentText>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsightsGraph;
