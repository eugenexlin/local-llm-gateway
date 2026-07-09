import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";

interface ModelFilterProps {
  selectedModel: string | null;
  onModelChange: (model: string | null) => void;
  loading?: boolean;
}

const ModelFilter: React.FC<ModelFilterProps> = ({
  selectedModel,
  onModelChange,
  loading = false,
}) => {
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/metrics/models", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setModels(data);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };
    fetchModels();
  }, []);

  const handleModelChange = (event: any) => {
    onModelChange(event.target.value || null);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>Model</InputLabel>
      <Select
        value={selectedModel || ""}
        label="Model"
        onChange={handleModelChange}
        disabled={loading}
        renderValue={(value) => {
          if (!value) {
            return (
              <Chip
                label="All Models"
                size="small"
                color="primary"
                variant="outlined"
              />
            );
          }
          return (
            <Chip
              label={value as string}
              size="small"
              color="primary"
              variant="outlined"
            />
          );
        }}
      >
        <MenuItem value="">
          <Chip
            label="All Models"
            size="small"
            color="primary"
            variant="outlined"
          />
        </MenuItem>
        {models.map((model) => (
          <MenuItem key={model} value={model}>
            {model}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ModelFilter;
