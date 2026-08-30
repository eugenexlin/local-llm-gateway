import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { MAX_SPARKLINE_POINTS } from "../../utils/constants";
import { USER_COLORS } from "../../utils/colors";
import { ChartTooltip } from "./InsightsGraph";

interface SparklineChartProps {
  data: { timestamp: number; value: number }[];
  width?: number;
  height?: number;
  yDomain?: [number, number];
  valueFormatter?: (value: number) => string;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 160,
  height = 60,
  yDomain,
  valueFormatter = (v) => `${v.toFixed(1)}%`,
}) => {
  // Build chart data with fixed positions (right-aligned)
  const chartData = data.map((d, i) => ({
    ...d,
    index: MAX_SPARKLINE_POINTS - data.length + i,
  }));

  // Fill empty slots for consistent spacing
  const fullData: {
    index: number;
    value: number | null;
    timestamp?: number;
  }[] = [];
  if (data.length === 0) {
    fullData.push({ index: 0, value: null });
  } else {
    for (let i = 0; i < MAX_SPARKLINE_POINTS; i++) {
      const point = chartData.find((d) => d.index === i);
      fullData.push({
        index: i,
        value: point ? point.value : null,
        timestamp: point ? point.timestamp : undefined,
      });
    }
  }
  const color = USER_COLORS[0];

  return (
    <div
      style={{
        height,
        width: "100%",
        backgroundColor: "transparent",
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 200, height: 200 }}
      >
        <LineChart width="100%" height="100%" data={fullData}>
          <XAxis
            dataKey="index"
            type="number"
            domain={[0, MAX_SPARKLINE_POINTS]}
            tickCount={5}
            hide
          />
          <YAxis
            width={24}
            domain={yDomain ?? [0, 100]}
            ticks={yDomain ? [yDomain[0], yDomain[1]] : [0, 100]}
            axisLine={{ stroke: `${color}66`, strokeWidth: 1 }}
            tickLine={{ stroke: `${color}66` }}
            tick={{ fontSize: 9, fill: `${color}88` }}
            interval={0}
            tickFormatter={(v: number) =>
              yDomain ? Math.round(v).toString() : `${v}%`
            }
          />
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={`${color}40`}
            vertical={false}
          />
          <Tooltip
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 1000, outline: "none" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const entry = payload[0];
                const value = entry.value as number | null;
                if (value === null || value === undefined) return null;
                const timestamp = entry.payload?.timestamp;
                return (
                  <ChartTooltip
                    timestamp={
                      timestamp
                        ? new Date(timestamp).toISOString()
                        : undefined
                    }
                    showSeconds
                    rows={[{ label: "", value: valueFormatter(value) }]}
                  />
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            fill="none"
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
