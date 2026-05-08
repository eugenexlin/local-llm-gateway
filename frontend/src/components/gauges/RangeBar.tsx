import { Box, LinearProgress, Typography } from "@mui/material";

interface RangeBarProps {
  value: number;
  min: number;
  max: number;
  formatValue: (v: number) => string;
  color: string;
}

const RangeBar: React.FC<RangeBarProps> = ({
  value,
  min,
  max,
  formatValue,
  color,
}) => {
  const fillPercent =
    max !== min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 100;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>
          {formatValue(min)}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color }}>
          {formatValue(value)}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>
          {formatValue(max)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={fillPercent}
        sx={{
          height: 6,
          borderRadius: 3,
          mt: 0.5,
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

export default RangeBar;
