export const getGaugeColor = (value: number | null): string => {
  if (value === null) return "#9e9e9e";
  if (value >= 80) return "#d32f2f";
  if (value >= 60) return "#f57c00";
  return "#2e7d32";
};
export const getRangeGuageColor = (
  value: number | null,
  min: number,
  max: number,
): string => {
  const sanValue = value ?? min;
  const sanMin = Math.min(min, sanValue);
  const sanMax = Math.max(sanMin + 1, Math.max(max, sanValue));

  const range = sanMax - sanMin;
  const valRatio = sanValue - sanMin;
  return getGaugeColor((valRatio / range) * 100);
};

export const USER_COLORS = [
  "#1976d2",
  "#d32f2f",
  "#388e3c",
  "#f57c00",
  "#7b1fa2",
  "#0097a7",
  "#c2185b",
  "#43a047",
  "#e64a19",
  "#5e35b1",
];
