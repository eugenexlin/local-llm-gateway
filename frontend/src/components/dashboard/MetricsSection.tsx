import React from "react";
import { Grid, Box, useMediaQuery } from "@mui/material";
import MetricCard from "./MetricCard";
import type { MetricType } from "../../types/metrics";
import { formatValue } from "../../utils/formatValue";
import { useDashboardMetrics } from "../../context/DashboardMetricsContext";
import theme from "../../theme";

const colors = [
  "#3b82f6", // blue-500
  "#aa3bff", // accent purple
  "#6366f1", // indigo-500
];

const MetricsSection: React.FC<{
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  tokens_per_sec?: number;
  input_tokens_per_sec?: number;
  output_tokens_per_sec?: number;
  request_count?: number;
  duration_ms?: number;
  ttft_ms?: number;
  stream_duration_ms?: number;
}> = ({
  total_tokens,
  total_input_tokens,
  total_output_tokens,
  tokens_per_sec,
  input_tokens_per_sec,
  output_tokens_per_sec,
  request_count,
  duration_ms,
  ttft_ms,
  stream_duration_ms,
}) => {
  const { visibleMetrics } = useDashboardMetrics();

  const allCards = [
    {
      key: "total_tokens" as MetricType,
      value: total_tokens,
      color: "",
    },
    {
      key: "input_tokens" as MetricType,
      value: total_input_tokens,
      color: "",
    },
    {
      key: "output_tokens" as MetricType,
      value: total_output_tokens,
      color: "",
    },
    {
      key: "tokens_per_sec" as MetricType,
      value: tokens_per_sec,
      color: "",
    },
    {
      key: "input_tokens_per_sec" as MetricType,
      value: input_tokens_per_sec,
      color: "",
    },
    {
      key: "output_tokens_per_sec" as MetricType,
      value: output_tokens_per_sec,
      color: "",
    },
    { key: "requests" as MetricType, value: request_count, color: colors[1] },
    { key: "ttft_ms" as MetricType, value: ttft_ms, color: colors[0] },
    { key: "stream_duration_ms" as MetricType, value: stream_duration_ms, color: colors[2] },
    { key: "duration_ms" as MetricType, value: duration_ms, color: "" },
  ].map((card, i) => ({ ...card, color: colors[i % colors.length] }));

  const cards = visibleMetrics
    ? visibleMetrics
        .map((key) => allCards.find((c) => c.key === key))
        .filter((c): c is NonNullable<typeof c> => c !== undefined)
    : allCards;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={isMobile ? 0 : 1}>
        {cards.map((card) => (
          <Grid
            key={card.key}
            size={{ xs: 12, sm: 6, md: 4, lg: 2 }}
            sx={{
              mb: 0.4,
              minWidth: 0,
            }}
          >
            <MetricCard
              metricKey={card.key}
              titleColor={card.color}
              value={formatValue(card.value)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MetricsSection;
