import React from "react";
import { Grid, Typography, Box } from "@mui/material";
import MetricCard from "./MetricCard";

interface MetricsSectionProps {
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  tokens_per_sec?: number;
  request_count?: number;
}

const colors = [
  "rgba(139, 92, 246, 0.15)",
  "rgba(59, 130, 246, 0.15)",
  "rgba(16, 185, 129, 0.15)",
  "rgba(245, 158, 11, 0.15)",
  "rgba(239, 68, 68, 0.15)",
];

const formatValue = (num?: number): string => {
  if (num === undefined || num === null) return "-";
  return num.toLocaleString();
};

const MetricsSection: React.FC<MetricsSectionProps> = ({
  total_tokens,
  total_input_tokens,
  total_output_tokens,
  tokens_per_sec,
  request_count,
}) => {
  const cards = [
    { key: "total_tokens" as const, value: total_tokens, color: colors[0] },
    { key: "total_input_tokens" as const, value: total_input_tokens, color: colors[1] },
    { key: "total_output_tokens" as const, value: total_output_tokens, color: colors[2] },
    { key: "tokens_per_sec" as const, value: tokens_per_sec, color: colors[3] },
    { key: "request_count" as const, value: request_count, color: colors[4] },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid
            key={card.key}
            sx={{
              mb: 1,
              gridColumn: {
                xs: "span 12",
                sm: "span 6",
                md: "span 4",
                lg: "span 2.4",
              },
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
