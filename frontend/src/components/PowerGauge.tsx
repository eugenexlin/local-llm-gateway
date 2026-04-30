import { Box, Typography } from "@mui/material";
import SparklineChart from "./SparklineChart";
import RangeBar from "./RangeBar";
import { getRangeGuageColor } from "../utils/colors";

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
  const color = getRangeGuageColor(value, globalMin, globalMax);
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, marginTop: 1}}>
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
