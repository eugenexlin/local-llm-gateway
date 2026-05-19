import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterShapeProps,
  PlotArea,
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
} from "../../types/metrics";
import { formatValue } from "../../utils/formatValue";
import { USER_COLORS } from "../../utils/colors";
import { usePlotArea } from "recharts";

const MAX_POINTS = 10000;

const AXIS_OPTIONS: { type: AxisType; label: string }[] = [
  { type: "prompt_tokens", label: "Input Tokens" },
  { type: "completion_tokens", label: "Output Tokens" },
  { type: "total_tokens", label: "Total Tokens" },
  { type: "duration_ms", label: "Duration (ms)" },
  { type: "tokens_per_sec", label: "Tokens/Sec" },
  { type: "input_tokens_per_sec", label: "Input Tokens/Sec" },
  { type: "output_tokens_per_sec", label: "Output Tokens/Sec" },
  { type: "ttft_ms", label: "TTFT (ms)" },
  { type: "stream_duration_ms", label: "Stream Duration (ms)" },
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
  {
    id: "ttft",
    label: "TTFT Analysis",
    xAxis: "prompt_tokens",
    yAxis: "ttft_ms",
    description: "Input tokens vs time to first token",
  },
  {
    id: "stream",
    label: "Stream Analysis",
    xAxis: "completion_tokens",
    yAxis: "stream_duration_ms",
    description: "Output tokens vs stream duration",
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
  const [chartDimensions, setChartDimensions] = useState({
    width: 800,
    height: 400,
  });
  const [heatmapGrid, setHeatmapGrid] = useState({
    gridWidth: 20,
    gridHeight: 10,
  });

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

  const heatmapDomain = useMemo(() => {
    if (!heatMapData || heatMapData.length === 0) return undefined;
    const first = heatMapData[0] as HeatMapDataPoint;
    return [first.minX, first.maxX] as [number, number];
  }, [heatMapData]);

  const heatmapYDomain = useMemo(() => {
    if (!heatMapData || heatMapData.length === 0) return undefined;
    const first = heatMapData[0] as HeatMapDataPoint;
    return [first.minY, first.maxY] as [number, number];
  }, [heatMapData]);

  const fetchData = async () => {
    setData(null);
    setHeatMapData(null);
    if (!config.xAxis || !config.yAxis || !startDate || !endDate) {
      return;
    }

    setLoading(true);
    setWarning(null);

    if (config.viewMode === "scatter") {
      fetch("/api/metrics/insights", {
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
      })
        .then((response) => {
          return response.json().then((result) => {
            if (result.warning) {
              setWarning(result.warning);
            }
            setData(result.data || []);
          });
        })
        .catch((error) => {
          console.error("Error fetching insights:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      fetch("/api/metrics/insights/heatmap", {
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
      })
        .then((response) => {
          return response.json().then((result) => {
            setHeatMapData(result.data || []);
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchData();
  }, [config, startDate, endDate, userId, apiKeyId, heatmapGrid]);

  interface PlotAreaHandlerProps {
    currentGridWidth: number;
    currentGridHeight: number;
    onGridChange: (width: number, height: number) => void;
  }
  const PlotAreaHandler = (props: PlotAreaHandlerProps) => {
    const plotArea = usePlotArea();
    if (!plotArea) {
      return;
    }

    const aspectRatio = plotArea.width / plotArea.height;
    const targetBins = 300;

    const approxUnits = Math.sqrt(targetBins / aspectRatio);
    const targetHeightBin = Math.ceil(approxUnits);

    const targetWidthBin = Math.ceil(approxUnits * aspectRatio);

    if (
      props.currentGridWidth !== targetWidthBin ||
      props.currentGridHeight !== targetHeightBin
    ) {
      props.onGridChange(targetWidthBin, targetHeightBin);
    }

    return null;
  };

  const handleGridChange = (width: number, height: number) => {
    setHeatmapGrid({ gridWidth: width, gridHeight: height });
  };

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    // this is busted but not motivated to fix as other solution is working
    const CHART_MARGINS = { top: 20, right: 20, bottom: 20, left: 20 };
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setChartDimensions({
        width: rect.width - CHART_MARGINS.left - CHART_MARGINS.right,
        height: rect.height - CHART_MARGINS.top - CHART_MARGINS.bottom,
      });
    };

    updateDimensions();

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [config]);

  // useEffect(() => {
  //   if (!heatMapData || heatMapData.length === 0) return;
  //   const aspectRatio = chartDimensions.width / chartDimensions.height;
  //   const targetBins = 300;

  //   const approxUnits = Math.sqrt(targetBins / aspectRatio);
  //   const targetHeightBin = Math.ceil(approxUnits);

  //   const targetWidthBin = Math.ceil(approxUnits * aspectRatio);

  //   setHeatmapGrid({ gridWidth: targetWidthBin, gridHeight: targetHeightBin });
  // }, [heatMapData, chartDimensions]);

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
    mode: string,
  ) => {
    onConfigChange({ ...config, viewMode: mode });
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

  const maxCount = Math.max(...(heatMapData || []).map((d) => d.count));

  return (
    <Box sx={{ mt: 4, pt: 2 }}>
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

        <ToggleButtonGroup
          value={config.viewMode}
          onChange={handleViewModeChange}
          size="small"
          exclusive
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
      </Box>

      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}

      {!config.xAxis || !config.yAxis ? (
        <Paper
          sx={{
            height: 400,
            minHeight: 400,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">
            Select X and Y axes to visualize usage data
          </Typography>
        </Paper>
      ) : (
        <Paper
          ref={chartContainerRef}
          key={config.viewMode}
          sx={{ height: 400, minHeight: 400, position: "relative" }}
        >
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                px: 2,
                zIndex: 10,
                borderRadius: 1,
              }}
            >
              <CircularProgress size={50} sx={{ mr: 1 }} />
            </Box>
          )}
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 400, height: 300 }}
          >
            {config.viewMode === "scatter" ? (
              <ScatterChart
                width="100%"
                height="100%"
                margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type={
                    isDateTimeAxis(config.xAxis) ? ("time" as any) : "number"
                  }
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
                      const tooltipRows: { label: string; value: string }[] = [
                        {
                          label: getAxisLabel(config.xAxis),
                          value: formatValue(Number(data[config.xAxis!])),
                        },
                        {
                          label: getAxisLabel(config.yAxis),
                          value: formatValue(Number(data[config.yAxis!])),
                        },
                      ];
                      if (data.ttft_ms !== undefined && data.ttft_ms !== null) {
                        tooltipRows.push({
                          label: "TTFT (ms)",
                          value: formatValue(data.ttft_ms),
                        });
                      }
                      if (
                        data.stream_duration_ms !== undefined &&
                        data.stream_duration_ms !== null
                      ) {
                        tooltipRows.push({
                          label: "Stream Duration (ms)",
                          value: formatValue(data.stream_duration_ms),
                        });
                      }
                      return (
                        <ChartTooltip
                          timestamp={data.timestamp}
                          title={userName}
                          rows={tooltipRows}
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
                      isAnimationActive={false}
                    />
                  ))
                ) : (
                  <Scatter
                    data={data || []}
                    fill="#8884d8"
                    onClick={handlePointClick}
                    cursor="pointer"
                    isAnimationActive={false}
                  />
                )}
              </ScatterChart>
            ) : (
              <ScatterChart
                width="100%"
                height="100%"
                margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
              >
                <XAxis
                  type={
                    isDateTimeAxis(config.xAxis) ? ("time" as any) : "number"
                  }
                  dataKey="x"
                  domain={
                    config.viewMode === "heatmap"
                      ? heatmapDomain
                      : data?.length
                        ? [
                            Math.min(
                              ...data.map(
                                (d) =>
                                  d[
                                    getXDataKey(
                                      config.xAxis,
                                    ) as keyof InsightsDataPoint
                                  ] as number,
                              ),
                            ),
                            Math.max(
                              ...data.map(
                                (d) =>
                                  d[
                                    getXDataKey(
                                      config.xAxis,
                                    ) as keyof InsightsDataPoint
                                  ] as number,
                              ),
                            ),
                          ]
                        : undefined
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
                    config.viewMode === "heatmap"
                      ? heatmapYDomain
                      : data?.length
                        ? [
                            Math.min(
                              ...data.map(
                                (d) =>
                                  d[
                                    getYDataKey(
                                      config.yAxis,
                                    ) as keyof InsightsDataPoint
                                  ] as number,
                              ),
                            ),
                            Math.max(
                              ...data.map(
                                (d) =>
                                  d[
                                    getYDataKey(
                                      config.yAxis,
                                    ) as keyof InsightsDataPoint
                                  ] as number,
                              ),
                            ),
                          ]
                        : undefined
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
                  isAnimationActive={false}
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
                  shape={(props: ScatterShapeProps) => {
                    const point = props.payload as HeatMapDataPoint;
                    const plotArea: PlotArea = usePlotArea() || {
                      width: chartDimensions.width,
                      height: chartDimensions.height,
                      x: 0,
                      y: 0,
                    };
                    const xUnitSize = plotArea.width / heatmapGrid.gridWidth;
                    const yUnitSize = plotArea.height / heatmapGrid.gridHeight;
                    const xCoord = Math.floor(
                      ((props.cx ?? plotArea.x) - plotArea.x) / xUnitSize,
                    );
                    const yCoord = Math.floor(
                      ((props.cy ?? plotArea.y) - plotArea.y) / yUnitSize,
                    );
                    const startX = Math.floor(xCoord * xUnitSize + plotArea.x);
                    const endX = Math.floor(
                      (xCoord + 1) * xUnitSize + plotArea.x,
                    );
                    const startY = Math.floor(yCoord * yUnitSize + plotArea.y);
                    const endY = Math.floor(
                      (yCoord + 1) * yUnitSize + plotArea.y,
                    );
                    return (
                      <>
                        <rect
                          key={props.index}
                          x={startX}
                          y={startY}
                          width={endX - startX}
                          height={endY - startY}
                          fill={
                            "color-mix(in oklab, var(--mui-palette-secondary-main) 80%, var(--mui-palette-primary-contrastText))"
                          }
                          stroke="none"
                          opacity={Math.sqrt(point.count / maxCount)}
                          name={`${props.cx}_${props.cy} ${xCoord}_${yCoord} ${xUnitSize}_${yUnitSize}`}
                        />
                        {/** just for testing to see the dot center */}
                        {/* <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={"4px"}
                          fill={
                            "color-mix(in oklab, var(--mui-palette-secondary-main) 80%, var(--mui-palette-primary-contrastText))"
                          }
                        /> */}
                      </>
                    );
                  }}
                  isAnimationActive={false}
                ></Scatter>
                <PlotAreaHandler
                  currentGridHeight={heatmapGrid.gridHeight}
                  currentGridWidth={heatmapGrid.gridWidth}
                  onGridChange={(width, height) => {
                    handleGridChange(width, height);
                  }}
                />
              </ScatterChart>
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
              {logDetails.ttft_ms !== null &&
                logDetails.ttft_ms !== undefined && (
                  <p>
                    <strong>TTFT:</strong> {logDetails.ttft_ms} ms
                  </p>
                )}
              {logDetails.stream_duration_ms !== null &&
                logDetails.stream_duration_ms !== undefined && (
                  <p>
                    <strong>Stream Duration:</strong>{" "}
                    {logDetails.stream_duration_ms} ms
                  </p>
                )}
              <p>
                <strong>Cache Creation:</strong>{" "}
                {logDetails.cache_creation_input_tokens || 0}
              </p>
              <p>
                <strong>Cache Read:</strong>{" "}
                {logDetails.cache_read_input_tokens || 0}
              </p>
            </Box>
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
