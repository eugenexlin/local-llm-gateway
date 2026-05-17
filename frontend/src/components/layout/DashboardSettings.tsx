import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  alpha,
} from "@mui/material";
import {
  DragIndicator,
  RemoveCircleOutline,
  AddCircleOutline,
} from "@mui/icons-material";
import type { MetricType } from "../../types/metrics";
import { metricLabels } from "../../utils/metricsLabels";
import { useDashboardMetrics, ALL_METRICS } from "../../context/DashboardMetricsContext";

const DashboardSettings: React.FC = () => {
  const { config, hideMetric, showMetric, reorderEnabled, resetToDefault } = useDashboardMetrics();
  const [draggedMetric, setDraggedMetric] = useState<MetricType | null>(null);

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
          onClick={resetToDefault}
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
