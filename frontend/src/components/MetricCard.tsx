import React from "react";
import { Typography, Box, CircularProgress } from "@mui/material";
import { metricLabels } from "../utils/metricsLabels";

interface MetricCardProps {
  metricKey: keyof typeof metricLabels;
  titleColor: string;
  value: string;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  metricKey,
  titleColor,
  value,
  isLoading = false,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        borderRadius: 1,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)",
        height: 110,
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderLeft: `4px solid ${titleColor}`,
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          {metricLabels[metricKey]}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          {isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontSize: "clamp(1.2rem, 2.5vw, 1.75rem)",
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MetricCard;
