import React from "react";
import { Grid, Box } from "@mui/material";
import MetricCard from "./MetricCard";
import type { MetricType } from "../types/metrics";
import { formatValue } from "../utils/formatValue";

interface MetricsSectionProps {
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  tokens_per_sec?: number;
  input_tokens_per_sec?: number;
  output_tokens_per_sec?: number;
  request_count?: number;
}

const colors = [
  "#8b5cf6", // violet-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
];

const MetricsSection: React.FC<MetricsSectionProps> = ({
  total_tokens,
  total_input_tokens,
  total_output_tokens,
  tokens_per_sec,
  input_tokens_per_sec,
  output_tokens_per_sec,
  request_count,
}) => {
  const cards = [
    {
      key: "total_tokens" as MetricType,
      value: total_tokens,
      color: colors[0],
    },
    {
      key: "input_tokens" as MetricType,
      value: total_input_tokens,
      color: colors[1],
    },
    {
      key: "output_tokens" as MetricType,
      value: total_output_tokens,
      color: colors[2],
    },
    {
      key: "tokens_per_sec" as MetricType,
      value: tokens_per_sec,
      color: colors[3],
    },
    {
      key: "input_tokens_per_sec" as MetricType,
      value: input_tokens_per_sec,
      color: colors[4],
    },
    {
      key: "output_tokens_per_sec" as MetricType,
      value: output_tokens_per_sec,
      color: colors[0],
    },
    { key: "requests" as MetricType, value: request_count, color: colors[1] },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid
            key={card.key}
            size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}
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
