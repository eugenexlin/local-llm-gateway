import React from "react";
import { Typography, Box, CircularProgress } from "@mui/material";

interface MetricCardProps {
  title: string;
  titleColor: string;
  value: string;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
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
        borderRadius: 2,
        boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
        overflow: "hidden",
        height: 100,
        width: 160,
      }}
    >
      <Box sx={{ bgcolor: titleColor, p: 2 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: "#000000",
            textTransform: "uppercase",
            fontSize: "11px",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: "32px",
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
