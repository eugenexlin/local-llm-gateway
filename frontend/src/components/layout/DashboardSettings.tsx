import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  alpha,
  Button,
} from "@mui/material";
import {
  DragIndicator,
  RemoveCircleOutline,
  AddCircleOutline,
} from "@mui/icons-material";
import type { MetricType } from "../../types/metrics";
import { metricLabels } from "../../utils/metricsLabels";
import { useAuth } from "../../context/AuthContext";
import { getItem, setItem } from "../../utils/storage";

export const ALL_METRICS: MetricType[] = [
  "total_tokens",
  "input_tokens",
  "output_tokens",
  "ttft_ms",
  "stream_duration_ms",
  "duration_ms",
  "tokens_per_sec",
  "input_tokens_per_sec",
  "output_tokens_per_sec",
  "requests",
];

const DEFAULT_CONFIG = {
  enabled: [...ALL_METRICS],
  disabled: [] as MetricType[],
};

interface DashboardSettingsConfig {
  enabled: MetricType[];
  disabled: MetricType[];
}

const DashboardSettings: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<DashboardSettingsConfig>(() => {
    if (!user) return DEFAULT_CONFIG;
    const stored = getItem(user.id, "dashboard-metrics-config");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fall through to default
      }
    }
    return DEFAULT_CONFIG;
  });

  const [draggedMetric, setDraggedMetric] = useState<MetricType | null>(null);

  useEffect(() => {
    if (user) {
      setItem(user.id, "dashboard-metrics-config", JSON.stringify(config));
    }
  }, [config, user]);

  const hideMetric = (metric: MetricType) => {
    const newEnabled = config.enabled.filter((m) => m !== metric);
    const newDisabled = [...config.disabled, metric];
    setConfig({ enabled: newEnabled, disabled: newDisabled });
  };

  const showMetric = (metric: MetricType) => {
    const newDisabled = config.disabled.filter((m) => m !== metric);
    const newEnabled = [...config.enabled, metric];
    setConfig({ enabled: newEnabled, disabled: newDisabled });
  };

  const reorderEnabled = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newEnabled = [...config.enabled];
    const [movedItem] = newEnabled.splice(fromIndex, 1);
    newEnabled.splice(toIndex, 0, movedItem);
    setConfig({ ...config, enabled: newEnabled });
  };

  const handleDragStart = (metric: MetricType) => {
    setDraggedMetric(metric);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (index: number) => {
    if (draggedMetric === null) return;
    const draggedIndex = config.enabled.findIndex((m) => m === draggedMetric);
    if (draggedIndex === -1 || draggedIndex === index) return;
    reorderEnabled(draggedIndex, index);
  };

  const handleDrop = () => {
    setDraggedMetric(null);
  };

  const handleDragEnd = () => {
    setDraggedMetric(null);
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Typography
        variant="h6"
        sx={{
          paddingBottom: "16px",
        }}
      >
        Metric Cards
      </Typography>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
        }}
      >
        <Button
          onClick={() => {
            setConfig(DEFAULT_CONFIG);
          }}
          color="secondary"
          variant="outlined"
          size="small"
          sx={{
            minWidth: 0,
            p: 0.5,
            "&:hover": {
              bgcolor: "transparent",
            },
          }}
        >
          Reset to Default
        </Button>
      </Box>

      {/* Enabled Section */}
      <Box sx={{ mb: 2, width: "320px" }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.05,
            display: "block",
            mb: 1,
          }}
        >
          Enabled ({config.enabled.length})
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {config.enabled.map((metric, index) => {
            const isDragged = draggedMetric === metric;

            return (
              <Box
                key={metric}
                draggable
                onDragStart={() => handleDragStart(metric)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                sx={{
                  display: "flex",
                  flex: 0,
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  opacity: isDragged ? 0.2 : 1,
                  cursor: "grab",
                  transition:
                    "background-color 0.3s ease, opacity 0.3s ease, transform 0.3s ease",
                  border: isDragged
                    ? (theme) =>
                        `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                    : "1px solid transparent",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <DragIndicator
                  sx={{
                    color: "text.disabled",
                    cursor: "grab",
                    userSelect: "none",
                    flexShrink: 0,
                    marginRight: "8px",
                  }}
                />
                <Box
                  sx={{
                    flex: 1,
                    fontSize: "1rem",
                    lineHeight: "1rem",
                    fontWeight: 500,
                  }}
                >
                  {metricLabels[metric]}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => hideMetric(metric)}
                  color="error"
                  sx={{ p: 0.25 }}
                >
                  <RemoveCircleOutline fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Disabled Section */}
      <Box sx={{ mb: 2, width: "320px" }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.05,
            display: "block",
            mb: 1,
          }}
        >
          Disabled ({config.disabled.length})
        </Typography>
        {config.disabled.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic", px: 1 }}
          >
            All metrics are visible
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {ALL_METRICS.filter((met) => config.disabled.includes(met)).map(
              (metric) => (
                <Box
                  key={metric}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: "36px",
                    }}
                  ></Box>
                  <Box
                    sx={{
                      flex: 1,
                      fontSize: "1rem",
                      lineHeight: "1rem",
                      fontWeight: 500,
                    }}
                  >
                    {metricLabels[metric]}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => showMetric(metric)}
                    color="success"
                    sx={{ p: 0.25 }}
                  >
                    <AddCircleOutline fontSize="small" />
                  </IconButton>
                </Box>
              ),
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DashboardSettings;
