import { Box, Typography } from "@mui/material";
import SparklineChart from "./SparklineChart";
import RangeBar from "./RangeBar";

interface PowerGaugeProps {
  value: number | null;
  history: { timestamp: number; value: number }[];
  globalMin: number;
  globalMax: number;
}

const PowerGauge: React.FC<PowerGaugeProps> = ({
  value,
  history,
  globalMin,
  globalMax,
}) => {
  const isActive = value !== null && value > 0;
  const color = "#8b5cf6";

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, display: "block" }}
          >
            Power
          </Typography>
          <RangeBar
            value={value ?? globalMin}
            min={globalMin}
            max={globalMax}
            formatValue={(v) => `${v}W`}
            color={color}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <SparklineChart
            data={history}
            color={color}
            width={160}
            height={72}
            yDomain={[globalMin, globalMax]}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PowerGauge;
