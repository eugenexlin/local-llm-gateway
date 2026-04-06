import React from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  SelectChangeEvent 
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  onGranularityChange: (granularity: 'hourly' | 'daily' | 'weekly' | 'monthly') => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  granularity,
  onGranularityChange
}) => {
  const handleGranularityChange = (event: SelectChangeEvent<string>) => {
    onGranularityChange(event.target.value as 'hourly' | 'daily' | 'weekly' | 'monthly');
  };

  const presetRanges = [
    { label: 'Last 1 day', start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'Last 7 days', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'Last 30 days', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'Last 90 days', start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'This year', start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
    { label: 'Custom', start: null, end: null }
  ];

  const [presetIndex, setPresetIndex] = React.useState(0);

  const applyPreset = (index: number) => {
    const preset = presetRanges[index];
    if (preset.start) {
      onStartDateChange(preset.start);
    }
    if (preset.end) {
      onEndDateChange(preset.end);
    }
    setPresetIndex(index);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Preset Range</InputLabel>
            <Select
              value={presetIndex}
              label="Preset Range"
              onChange={(e) => applyPreset(e.target.value as number)}
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
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null;
              onStartDateChange(date);
              setPresetIndex(4);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <TextField
            label="To"
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null;
              onEndDateChange(date);
              setPresetIndex(4);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Granularity</InputLabel>
            <Select
              value={granularity}
              label="Granularity"
              onChange={handleGranularityChange}
            >
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default DateRangePicker;
