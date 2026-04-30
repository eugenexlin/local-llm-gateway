import { Box, LinearProgress, Typography } from "@mui/material";

interface VramGaugeProps {
  value: number | null;
  total: number | null;
}

const VramGauge: React.FC<VramGaugeProps> = ({ value, total }) => {
  const isActive = value !== null && total !== null && total > 0;
  const percent = isActive ? (value! / total!) * 100 : 0;

  const getColor = (pct: number): string => {
    if (pct >= 85) return "#d32f2f";
    if (pct >= 70) return "#f57c00";
    return "#2e7d32";
  };

  const color = getColor(percent);
  const displayValue = isActive ? `${value} / ${total} GB` : "N/A";
  const displayPercent = isActive ? `${percent.toFixed(0)}%` : "N/A";

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ fontWeight: 500, display: "block" }}
      >
        VRAM
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color }}
        >
          {displayValue}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color }}
        >
          {displayPercent}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={isActive ? percent : 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "rgba(0,0,0,0.06)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
            bgcolor: color,
          },
        }}
      />
    </Box>
  );
};

export default VramGauge;
