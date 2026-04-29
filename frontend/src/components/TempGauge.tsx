import { Box, Typography } from "@mui/material";
import SparklineChart from "./SparklineChart";
import RangeBar from "./RangeBar";

interface TempGaugeProps {
  title: string;
  value: number | null;
  history: { timestamp: number; value: number }[];
  globalMin: number;
  globalMax: number;
  color: string;
}

const TempGauge: React.FC<TempGaugeProps> = ({
  title,
  value,
  history,
  globalMin,
  globalMax,
  color,
}) => {
  const isActive = value !== null;

  return (
    <Box>
      <Box sx={{ mb: 0.5 }}></Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 0.5,
        }}
      >
        <Box sx={{ flex: 1, marginTop: 1 }}>
          <Typography variant="body2">{title}</Typography>
          <RangeBar
            value={isActive ? value : (globalMin + globalMax) / 2}
            min={globalMin}
            max={globalMax}
            formatValue={(v) => `${v}°C`}
            color={isActive ? color : "#9e9e9e"}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <SparklineChart
            data={history}
            color={isActive ? color : "#9e9e9e"}
            width={160}
            height={72}
            yDomain={[globalMin, globalMax]}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default TempGauge;
