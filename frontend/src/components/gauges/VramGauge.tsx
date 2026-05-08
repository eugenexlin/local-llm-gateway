import { Box, LinearProgress, Typography } from "@mui/material";
import { getGaugeColor } from "../../utils/colors";

interface VramGaugeProps {
  value: number | null;
  total: number | null;
}

const VramGauge: React.FC<VramGaugeProps> = ({ value, total }) => {
  const isActive = value !== null && total !== null && total > 0;
  const usedValue = value ?? 0;
  const usedTotal = total ?? 1;

  const percent = (usedValue / usedTotal) * 100;

  const color = getGaugeColor(isActive ? percent : null);
  const displayValue = `${usedValue} / ${usedTotal} GB`;
  const displayPercent = `${percent.toFixed(0)}%`;

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 500, display: "block" }}>
        VRAM
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color }}>
          {displayValue}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color }}>
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
