import { Box, Typography } from "@mui/material";
import RangeBar from "./RangeBar";

interface FanGaugeProps {
  value: number | null;
  globalMin: number;
  globalMax: number;
}

const FanGauge: React.FC<FanGaugeProps> = ({
  value,
  globalMin,
  globalMax,
}) => {
  const color = "#2196f3";

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 500, display: "block" }}>
        Fan
      </Typography>
      <RangeBar
        value={value ?? globalMin}
        min={globalMin}
        max={globalMax}
        formatValue={(v) => `${v} RPM`}
        color={color}
      />
    </Box>
  );
};

export default FanGauge;
