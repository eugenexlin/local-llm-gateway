import React, { useState, useEffect, useMemo } from "react";
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
    if (mode) {
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
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Select X and Y axes to visualize usage data
          </Typography>
        </Paper>
      ) : loading ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <CircularProgress />
        </Paper>
      ) : (
        <Paper sx={{ height: 400 }}>
          <ResponsiveContainer>
            {config.viewMode === "scatter" ? (
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type={isDateTimeAxis(config.xAxis) ? "time" : "number"}
                  dataKey={getXDataKey(config.xAxis)}
                  name={getAxisLabel(config.xAxis)}
                  label={{
                    value: getAxisLabel(config.xAxis),
                    position: "insideBottom",
                    offset: -10,
                  }}
                  tickFormatter={(value, index) => formatValue(value)}
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
                  tickFormatter={(value, index) => formatValue(value)}
                />
                <Tooltip
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as InsightsDataPoint;
                      const userName =
                        data.user_name || data.user_email || "Unknown";
                      return (
                        <div
                          style={{
                            background: "#fff",
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: "bold" }}>
                            {userName}
                          </p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                            X: {formatValue(data[config.xAxis!])}
                          </p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                            Y: {formatValue(data[config.yAxis!])}
                          </p>
                        </div>
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
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  label={{
                    value: getAxisLabel(config.xAxis),
                    position: "insideBottom",
                    offset: -10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  label={{
                    value: getAxisLabel(config.yAxis),
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const point = payload[0].payload as HeatMapDataPoint;
                      return (
                        <div
                          style={{
                            background: "#fff",
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                          }}
                        >
                          <p style={{ margin: 0 }}>
                            X Bin: {point.x}, Y Bin: {point.y}
                          </p>
                          <p
                            style={{ margin: "4px 0 0 0", fontWeight: "bold" }}
                          >
                            Count: {point.count}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  data={heatMapData || []}
                  fill="#82ca9d"
                  shape="rectangle"
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
