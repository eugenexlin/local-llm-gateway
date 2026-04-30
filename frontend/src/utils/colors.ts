export const getGaugeColor = (value: number | null): string => {
  if (value === null) return "#9e9e9e";
  if (value >= 80) return "#d32f2f";
  if (value >= 60) return "#f57c00";
  return "#2e7d32";
};
