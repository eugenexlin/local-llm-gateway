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
  "#3b82f6", // blue-500
  "#aa3bff", // accent purple
  "#6366f1", // indigo-500
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
    // {
    //   key: "tokens_per_sec" as MetricType,
    //   value: tokens_per_sec,
    //   color: "",
    // },
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
  ].map((card, i) => ({ ...card, color: colors[i % colors.length] }));

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
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
