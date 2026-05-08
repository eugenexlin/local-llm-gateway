import { Box, Typography } from "@mui/material";
import SparklineChart from "../charts/SparklineChart";
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
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, marginTop: 1 }}>
          <Typography variant="body2">{title}</Typography>
          <RangeBar
            value={value ?? globalMin}
            min={globalMin}
            max={globalMax}
            formatValue={(v) => `${v}°C`}
            color={color}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <SparklineChart
            data={history}
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
