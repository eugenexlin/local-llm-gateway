import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import { ServerHealthInfo } from "../../types/metrics";
import { useServerContext } from "../../context/ServerContext";

interface ServerFilterProps {
  selectedServerName: string | null;
  onServerChange: (serverName: string) => void;
  loading?: boolean;
}

const ServerFilter: React.FC<ServerFilterProps> = ({
  selectedServerName,
  onServerChange,
  loading = false,
}) => {
  const { serverConfig, healthMap } = useServerContext();

  const handleServerChange = (event: any) => {
    onServerChange(event.target.value);
  };

  const statusColor = (health?: ServerHealthInfo) => {
    if (!health) return "#9e9e9e";
    if (health.offline) return "#ff9800";
    return health.healthy ? "#4caf50" : "#f44336";
  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>Server</InputLabel>
      <Select
        value={selectedServerName || ""}
        label="Server"
        onChange={handleServerChange}
        disabled={loading || serverConfig.length === 0}
        renderValue={(value) => {
          if (!value) return null;
          const server = serverConfig.find(s => s.name === value);
          const health = healthMap[value];
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: statusColor(health),
                }}
              />
              <Chip
                label={server?.name || value}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          );
        }}
      >
        {serverConfig.map((server) => {
          const health = healthMap[server.name];
          return (
            <MenuItem key={server.name} value={server.name}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: statusColor(health),
                  }}
                />
                <Typography variant="body2">{server.name}</Typography>
                {server.models.length > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {server.models.length} models
                  </Typography>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default ServerFilter;