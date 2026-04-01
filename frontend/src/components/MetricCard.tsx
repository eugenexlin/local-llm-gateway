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
        boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
        height: 100,
        width: 220,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          bgcolor: titleColor,
          p: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: "#333333",
            textTransform: "uppercase",
            fontSize: "10px",
            letterSpacing: 0.5,
          }}
        >
          {metricLabels[metricKey]}
        </Typography>
      </Box>
      <Box
        sx={{
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
        }}
      >
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: "clamp(12px, 4vw, 32px)",
            }}
          >
            {value}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MetricCard;
