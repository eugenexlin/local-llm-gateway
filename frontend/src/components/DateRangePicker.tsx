import React from "react";
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { calculateOptimalGranularitySeconds } from "../utils/granularity";
import type { GranularitySeconds } from "../types/metrics";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onGranularityChange?: (granularity: GranularitySeconds) => void;
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
  onGranularityChange,
}) => {
  const [startDateStr, setStartDateStr] = React.useState("");
  const [startTimeStr, setStartTimeStr] = React.useState("00:00");
  const [endDateStr, setEndDateStr] = React.useState("");
  const [endTimeStr, setEndTimeStr] = React.useState("23:59");
  const [presetIndex, setPresetIndex] = React.useState(1);
  const [granularitySet, setGranularitySet] = React.useState(false);
  const isInternalUpdate = React.useRef(false);

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
    if (date && !isInternalUpdate.current) {
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

  React.useEffect(() => {
    if (startDate && !isInternalUpdate.current) {
      syncFromParentDate(startDate, true);
    }
  }, [startDate]);

  React.useEffect(() => {
    if (endDate && !isInternalUpdate.current) {
      syncFromParentDate(endDate, false);
    }
  }, [endDate]);

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

    if (!granularitySet && start && end) {
      const optimalGranularitySeconds = calculateOptimalGranularitySeconds(start, end);
      if (onGranularityChange) {
        onGranularityChange(optimalGranularitySeconds);
      }
      setGranularitySet(true);
    }

    if (start) {
      isInternalUpdate.current = true;
      onStartDateChange(start);
      setTimeout(() => { isInternalUpdate.current = false; }, 0);
    }
    if (end) {
      isInternalUpdate.current = true;
      onEndDateChange(end);
      setTimeout(() => { isInternalUpdate.current = false; }, 0);
    }
    setPresetIndex(index);
  };

  const handleDateSubmit = (field: "start" | "end") => {
    const dateStr = field === "start" ? startDateStr : endDateStr;
    const timeStr = field === "start" ? startTimeStr : endTimeStr;

    if (!dateStr) return;

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    const newDate = new Date(year, month - 1, day, hours, minutes || 0);

    isInternalUpdate.current = true;
    if (field === "start") {
      onStartDateChange(newDate);
      setPresetIndex(presetRanges.length - 1);
    } else {
      onEndDateChange(newDate);
      setPresetIndex(presetRanges.length - 1);
    }
    setTimeout(() => { isInternalUpdate.current = false; }, 0);
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
          onChange={(e) => {
            setStartDateStr(e.target.value);
            setPresetIndex(presetRanges.length - 1);
          }}
          onBlur={() => handleDateSubmit("start")}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
           label="Time"
           type="time"
           value={startTimeStr}
           onChange={(e) => {
             setStartTimeStr(e.target.value);
             setPresetIndex(presetRanges.length - 1);
           }}
           onBlur={() => handleDateSubmit("start")}
           InputLabelProps={{ shrink: true }}
           sx={{ width: 160 }}
           inputProps={{ step: 60 }}
         />
        <TextField
          label="To"
          type="date"
          value={endDateStr}
          onChange={(e) => {
            setEndDateStr(e.target.value);
            setPresetIndex(presetRanges.length - 1);
          }}
          onBlur={() => handleDateSubmit("end")}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
       <TextField
           label="Time"
           type="time"
           value={endTimeStr}
           onChange={(e) => {
             setEndTimeStr(e.target.value);
             setPresetIndex(presetRanges.length - 1);
           }}
           onBlur={() => handleDateSubmit("end")}
           InputLabelProps={{ shrink: true }}
           sx={{ width: 160 }}
           inputProps={{ step: 60 }}
         />
      </Box>
    </Paper>
  );
};

export default DateRangePicker;
