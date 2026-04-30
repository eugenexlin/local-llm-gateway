import React from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import SparklineChart from "./SparklineChart";

interface LoadGaugeProps {
  title: string;
  value: number | null;
  color: string;
  progressColor?: string;
  sparklineData: { timestamp: number; value: number }[];
  extraContent?: React.ReactNode;
}

const LoadGauge: React.FC<LoadGaugeProps> = ({
  title,
  value,
  color,
  progressColor,
  sparklineData,
  extraContent,
}) => {
  const displayValue = value !== null ? `${value.toFixed(1)}%` : "0%";
  const progressValue = value ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 0.5,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color,
              mb: 1,
            }}
          >
            {displayValue}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "rgba(0,0,0,0.06)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                bgcolor: progressColor || color,
              },
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <SparklineChart
            data={sparklineData}
            color={color}
            width={160}
            height={72}
          />
        </Box>
      </Box>
      {extraContent}
    </Box>
  );
};

export default LoadGauge;
