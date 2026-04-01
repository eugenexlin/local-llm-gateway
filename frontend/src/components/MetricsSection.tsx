import React from "react";
import { Grid, Typography, Box } from "@mui/material";
import MetricCard from "./MetricCard";

interface Metric {
  title: string;
  value?: number;
}

interface MetricsSectionProps {
  title: string;
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
  title,
  total_tokens,
  total_input_tokens,
  total_output_tokens,
  tokens_per_sec,
  request_count,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Grid container spacing={2}>
        <Grid
          item
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
            title="Total Tokens"
            titleColor={colors[0]}
            value={formatValue(total_tokens)}
          />
        </Grid>
        <Grid
          item
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
            title="Total Input"
            titleColor={colors[1]}
            value={formatValue(total_input_tokens)}
          />
        </Grid>
        <Grid
          item
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
            title="Total Output"
            titleColor={colors[2]}
            value={formatValue(total_output_tokens)}
          />
        </Grid>
        <Grid
          item
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
            title="Tokens/Sec"
            titleColor={colors[3]}
            value={formatValue(tokens_per_sec)}
          />
        </Grid>
        <Grid
          item
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
            title="Request Count"
            titleColor={colors[4]}
            value={formatValue(request_count)}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MetricsSection;
