export const DATE_PRESETS: PresetRange[] = [
  { label: "Last 1 hour", hours: 1, isRelative: true },
  { label: "Last 4 hours", hours: 4, isRelative: true },
  { label: "Last 1 day", days: 1, isRelative: true },
  { label: "Last 3 days", days: 3, isRelative: true },
  { label: "Last 7 days", days: 7, isRelative: true },
  { label: "Last 30 days", days: 30, isRelative: true },
  { label: "Last 90 days", days: 90, isRelative: true },
  { label: "Last 6 months", months: 6, isRelative: true },
  { label: "Last 12 months", months: 12, isRelative: true },
  { label: "Custom", isRelative: false },
];

export interface PresetRange {
  label: string;
  hours?: number;
  days?: number;
  months?: number;
  years?: number;
  isRelative?: boolean;
}
