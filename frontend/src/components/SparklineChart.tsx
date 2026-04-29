import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface SparklineChartProps {
  data: { timestamp: number; value: number }[];
  color: string;
  width?: number;
  height?: number;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color,
  width = 160,
  height = 40,
}) => {
  if (data.length < 2) {
    return (
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={[]}>
          <Line
            type="bessel"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;

  const chartData = data.map((d, i) => ({
    ...d,
    index: i,
    normalized:
      ((d.value - (minVal - padding)) / (range + padding * 2)) * 100,
  }));

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="transparent" />
        <Line
          type="bessel"
          dataKey="normalized"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          fill="none"
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SparklineChart;
