import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import { ServerConfigItem, ServerHealthInfo } from "../../types/metrics";

interface ServerFilterProps {
  selectedServerId: string | null;
  onServerChange: (serverId: string) => void;
  loading?: boolean;
}

const ServerFilter: React.FC<ServerFilterProps> = ({
  selectedServerId,
  onServerChange,
  loading = false,
}) => {
  const [servers, setServers] = useState<ServerConfigItem[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, ServerHealthInfo>>({});

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch("/api/server-stats/config", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setServers(data);
        }
      } catch (error) {
        console.error("Error fetching server config:", error);
      }
    };
    fetchServers();
  }, []);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/server-stats/health", {
          credentials: "include",
        });
        if (response.ok) {
          const data: ServerHealthInfo[] = await response.json();
          const map: Record<string, ServerHealthInfo> = {};
          data.forEach(h => {
            map[h.id] = h;
          });
          setHealthMap(map);
        }
      } catch (error) {
        console.error("Error fetching server health:", error);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServerChange = (event: any) => {
    onServerChange(event.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>Server</InputLabel>
      <Select
        value={selectedServerId || ""}
        label="Server"
        onChange={handleServerChange}
        disabled={loading || servers.length === 0}
        renderValue={(value) => {
          if (!value) return null;
          const server = servers.find(s => s.id === value);
          const health = healthMap[value];
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: health?.healthy ? "#4caf50" : "#f44336",
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
        {servers.map((server) => {
          const health = healthMap[server.id];
          return (
            <MenuItem key={server.id} value={server.id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: health?.healthy ? "#4caf50" : "#f44336",
                  }}
                />
                <Typography variant="body2">{server.name || server.id}</Typography>
                {server.endpoints.length > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {server.endpoints.length} endpoints
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