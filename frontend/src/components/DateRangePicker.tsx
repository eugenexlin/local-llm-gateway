import React from "react";
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
} from "@mui/material";
import { calculateOptimalGranularity } from "../utils/granularity";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onRefresh: () => void;
  onGranularityChange?: (granularity: string) => void;
}

interface PresetRange {
  label: string;
  days?: number;
  months?: number;
  years?: number;
  isRelative?: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  onGranularityChange,
}) => {
const [startDateStr, setStartDateStr] = React.useState("");
    const [startTimeStr, setStartTimeStr] = React.useState("00:00");
    const [endDateStr, setEndDateStr] = React.useState("");
    const [endTimeStr, setEndTimeStr] = React.useState("23:59");
    const [presetIndex, setPresetIndex] = React.useState(1);
    const [granularitySet, setGranularitySet] = React.useState(false);
    const [lastActionWasPreset, setLastActionWasPreset] = React.useState(false);

    const presetRanges: PresetRange[] = [
    { label: "Last 1 day", days: 1, isRelative: true },
    { label: "Last 3 days", days: 3, isRelative: true },
    { label: "Last 7 days", days: 7, isRelative: true },
    { label: "Last 30 days", days: 30, isRelative: true },
    { label: "Last 90 days", days: 90, isRelative: true },
    { label: "Last 6 months", months: 6, isRelative: true },
    { label: "Last 12 months", months: 12, isRelative: true },
    { label: "This year", years: 0, isRelative: true },
    { label: "Custom", isRelative: false },
  ];

  const syncFromParentDate = (date: Date | null, isStart: boolean) => {
    if (date) {
      const dateStr = date.toISOString().split("T")[0];
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      if (isStart) {
        setStartDateStr(dateStr);
        setStartTimeStr(`${hours}:${minutes}`);
      } else {
        setEndDateStr(dateStr);
        setEndTimeStr(`${hours}:${minutes}`);
      }
    }
  };

  const initializePresetFromDates = React.useCallback(() => {
    if (!startDate || !endDate) return;

    const now = new Date();
    const startOnlyDate = new Date(startDate);
    startOnlyDate.setHours(0, 0, 0, 0);
    const nowOnlyDate = new Date(now);
    nowOnlyDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(nowOnlyDate.getTime() - startOnlyDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const matchIndex = presetRanges.findIndex((preset) => {
      if (!preset.isRelative) return false;
      if (preset.days !== undefined && Math.abs(preset.days - diffDays) <= 1) return true;
      if (preset.months !== undefined) {
        const monthsDiff = Math.floor(diffDays / 30);
        return monthsDiff >= preset.months - 1 && monthsDiff <= preset.months + 1;
      }
      return false;
    });

    if (matchIndex !== -1) {
      setPresetIndex(matchIndex);
      setLastActionWasPreset(true);
    } else {
      setPresetIndex(presetRanges.length - 1);
      setLastActionWasPreset(false);
    }
    setGranularitySet(false);
  }, [startDate, endDate, presetRanges]);

  React.useEffect(() => {
    if (startDate) {
      syncFromParentDate(startDate, true);
      initializePresetFromDates();
    }
  }, [startDate, initializePresetFromDates]);

  React.useEffect(() => {
    if (endDate) {
      syncFromParentDate(endDate, false);
      initializePresetFromDates();
    }
  }, [endDate, initializePresetFromDates]);

  const applyPreset = (index: number) => {
    const preset = presetRanges[index];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    let start: Date | null;
    let end: Date | null;

    if (preset.isRelative) {
      if (preset.days !== undefined) {
        start = new Date(now.getTime() - preset.days * 24 * 60 * 60 * 1000);
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now.getTime());
        end.setHours(currentHours, currentMinutes, 0, 0);
      } else if (preset.months !== undefined) {
        start = new Date(now.getFullYear(), now.getMonth() - preset.months, now.getDate());
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now);
        end.setHours(currentHours, currentMinutes, 0, 0);
      } else if (preset.years !== undefined) {
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now);
        end.setHours(currentHours, currentMinutes, 0, 0);
      } else {
        start = new Date(now.getTime());
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now.getTime());
        end.setHours(currentHours, currentMinutes, 0, 0);
      }
    } else {
      start = null;
      end = null;
    }

    // Only calculate and set granularity if it hasn't been set yet
    if (!granularitySet && start && end) {
      const optimalGranularity = calculateOptimalGranularity(start, end);
      if (onGranularityChange) {
        onGranularityChange(optimalGranularity);
      }
      setGranularitySet(true);
    }

    if (start) {
      onStartDateChange(start);
    }
    if (end) {
      onEndDateChange(end);
    }
    setPresetIndex(index);
    setLastActionWasPreset(true);
  };

  const handleDateSubmit = (field: "start" | "end") => {
    const dateStr = field === "start" ? startDateStr : endDateStr;
    const timeStr = field === "start" ? startTimeStr : endTimeStr;

    if (!dateStr) return;

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    const newDate = new Date(year, month - 1, day, hours, minutes || 0);

    if (field === "start") {
      onStartDateChange(newDate);
      setPresetIndex(presetRanges.length - 1);
      setLastActionWasPreset(false);
    } else {
      onEndDateChange(newDate);
      setPresetIndex(presetRanges.length - 1);
      setLastActionWasPreset(false);
    }
  };

  const refreshPresets = () => {
    const currentPreset = presetRanges[presetIndex];
    
    // Only recalculate dates if a relative preset is active
    // This allows refresh to update dates for presets like "Last 3 days"
    // but won't modify custom date ranges
    if (currentPreset.isRelative) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      let start: Date | null;
      let end: Date | null;

      if (currentPreset.days !== undefined) {
        start = new Date(now.getTime() - currentPreset.days * 24 * 60 * 60 * 1000);
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now.getTime());
        end.setHours(currentHours, currentMinutes, 0, 0);
      } else if (currentPreset.months !== undefined) {
        start = new Date(now.getFullYear(), now.getMonth() - currentPreset.months, now.getDate());
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now);
        end.setHours(currentHours, currentMinutes, 0, 0);
      } else if (currentPreset.years !== undefined) {
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now);
        end.setHours(currentHours, currentMinutes, 0, 0);
      } else {
        start = new Date(now.getTime());
        start.setHours(currentHours, currentMinutes, 0, 0);
        end = new Date(now.getTime());
        end.setHours(currentHours, currentMinutes, 0, 0);
      }

      if (start) {
        onStartDateChange(start);
      }
      if (end) {
        onEndDateChange(end);
      }
      onRefresh();
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Preset Range</InputLabel>
          <Select
            value={presetIndex}
            label="Preset Range"
            onChange={(e) => {
              applyPreset(e.target.value as number);
              onRefresh();
            }}
          >
            {presetRanges.map((preset, index) => (
              <MenuItem key={index} value={index}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="From"
          type="date"
          value={startDateStr}
          onChange={(e) => setStartDateStr(e.target.value)}
          onBlur={() => handleDateSubmit("start")}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Time"
          type="time"
          value={startTimeStr}
          onChange={(e) => setStartTimeStr(e.target.value)}
          onBlur={() => handleDateSubmit("start")}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
          inputProps={{ step: 60 }}
        />
        <TextField
          label="To"
          type="date"
          value={endDateStr}
          onChange={(e) => setEndDateStr(e.target.value)}
          onBlur={() => handleDateSubmit("end")}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Time"
          type="time"
          value={endTimeStr}
          onChange={(e) => setEndTimeStr(e.target.value)}
          onBlur={() => handleDateSubmit("end")}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
          inputProps={{ step: 60 }}
        />

        <TextField
          label="Refresh"
          type="button"
          value="↻ Refresh"
          onClick={refreshPresets}
          sx={{ minWidth: 120, cursor: "pointer" }}
          InputProps={{
            readOnly: true,
            sx: {
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default DateRangePicker;
