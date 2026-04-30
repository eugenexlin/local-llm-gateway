import { Box, Typography } from "@mui/material";
import RangeBar from "./RangeBar";

interface FanGaugeProps {
  value: number | null;
  history: { timestamp: number; value: number }[];
  globalMin: number;
  globalMax: number;
}

const FanGauge: React.FC<FanGaugeProps> = ({
  value,
  history,
  globalMin,
  globalMax,
}) => {
  const isActive = value !== null && value > 0;
  const color = "#2196f3";

  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 500, display: "block" }}>
        Fan
      </Typography>
      <Box>
        <RangeBar
          value={isActive ? value : (globalMin + globalMax) / 2}
          min={globalMin}
          max={globalMax}
          formatValue={(v) => `${v} RPM`}
          color={isActive ? color : "#9e9e9e"}
        />
      </Box>
    </Box>
  );
};

export default FanGauge;
