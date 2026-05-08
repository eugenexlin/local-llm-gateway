import React from "react";
import { Typography, Box, CircularProgress, useMediaQuery, useTheme } from "@mui/material";
import { metricLabels } from "../../utils/metricsLabels";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "row" : "column",
        alignItems: isMobile ? "center" : "flex-start",
        bgcolor: "background.paper",
        borderRadius: 1,
        boxShadow: isMobile ? "0 1px 3px rgba(0,0,0,0.06)" : "0 2px 4px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)",
        height: isMobile ? 48 : 96,
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderLeft: `4px solid ${titleColor}`,
        px: isMobile ? 1.5 : 2,
        py: isMobile ? 1 : 2,
        gap: isMobile ? 1 : 0,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: isMobile ? 500 : 500,
            color: "text.secondary",
            fontSize: isMobile ? "0.65rem" : "0.7rem",
            letterSpacing: isMobile ? 0.5 : 1,
            display: "-webkit-box",
            WebkitLineClamp: isMobile ? 1 : "auto",
            WebkitBoxOrient: "vertical",
            overflow: isMobile ? "hidden" : "visible",
            mb: 0,
          }}
        >
          {metricLabels[metricKey]}
        </Typography>
      </Box>
      <Box sx={{ flex: "0 0 auto", minWidth: 0 }}>
        {isLoading ? (
          <CircularProgress size={isMobile ? 20 : 24} />
        ) : (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: isMobile ? "1.0rem" : "clamp(1.0rem, 2.0vw, 1.5rem)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
