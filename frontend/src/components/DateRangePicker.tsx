import React from "react";
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DATE_PRESETS } from "../utils/dateUtils";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onPresetChange: (index?: number) => void;
  presetIndex?: number;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPresetChange,
  presetIndex: externalPresetIndex,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [startDateStr, setStartDateStr] = React.useState("");
  const [startTimeStr, setStartTimeStr] = React.useState("00:00");
  const [endDateStr, setEndDateStr] = React.useState("");
  const [endTimeStr, setEndTimeStr] = React.useState("23:59");
  const [presetIndex, setPresetIndex] = React.useState(1);
  const isInternalUpdate = React.useRef(false);

  const activePresetIndex =
    externalPresetIndex !== undefined ? externalPresetIndex : presetIndex;
  const setActivePresetIndex = (index: number) => {
    setPresetIndex(index);
    onPresetChange?.(index);
  };

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
      setActivePresetIndex(DATE_PRESETS.length - 1);
    } else {
      onEndDateChange(newDate);
      setActivePresetIndex(DATE_PRESETS.length - 1);
    }
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 2,
        flexWrap: isMobile ? "nowrap" : "wrap",
        alignItems: "flex-end",
      }}
    >
      <FormControl
        sx={{
          minWidth: 200,
          width: isMobile ? "100%" : "auto",
        }}
      >
        <InputLabel>Preset Range</InputLabel>
        <Select
          value={activePresetIndex}
          label="Preset Range"
          onChange={(e) => {
            onPresetChange(e.target.value as number);
          }}
        >
          {DATE_PRESETS.map((preset, index) => (
            <MenuItem key={index} value={index}>
              {preset.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isMobile ? (
        <>
          <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
            <TextField
              label="From"
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                setActivePresetIndex(DATE_PRESETS.length - 1);
              }}
              onBlur={() => handleDateSubmit("start")}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Time"
              type="time"
              value={startTimeStr}
              onChange={(e) => {
                setStartTimeStr(e.target.value);
                setActivePresetIndex(DATE_PRESETS.length - 1);
              }}
              onBlur={() => handleDateSubmit("start")}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
              inputProps={{ step: 60 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
            <TextField
              label="To"
              type="date"
              value={endDateStr}
              onChange={(e) => {
                setEndDateStr(e.target.value);
                setActivePresetIndex(DATE_PRESETS.length - 1);
              }}
              onBlur={() => handleDateSubmit("end")}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Time"
              type="time"
              value={endTimeStr}
              onChange={(e) => {
                setEndTimeStr(e.target.value);
                setActivePresetIndex(DATE_PRESETS.length - 1);
              }}
              onBlur={() => handleDateSubmit("end")}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
              inputProps={{ step: 60 }}
            />
          </Box>
        </>
      ) : (
        <>
          <TextField
            label="From"
            type="date"
            value={startDateStr}
            onChange={(e) => {
              setStartDateStr(e.target.value);
              setActivePresetIndex(DATE_PRESETS.length - 1);
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
              setActivePresetIndex(DATE_PRESETS.length - 1);
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
              setActivePresetIndex(DATE_PRESETS.length - 1);
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
              setActivePresetIndex(DATE_PRESETS.length - 1);
            }}
            onBlur={() => handleDateSubmit("end")}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
            inputProps={{ step: 60 }}
          />
        </>
      )}
    </Box>
  );
};

export default DateRangePicker;
