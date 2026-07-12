import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ServerConfigItem, ServerHealthInfo, ModelConfig } from "../types/metrics";

const Models: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [serverConfig, setServerConfig] = useState<ServerConfigItem[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, ServerHealthInfo>>({});

  const fetchServerConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/server-stats/config", {
        credentials: "include",
      });
      if (response.ok) {
        const data: ServerConfigItem[] = await response.json();
        setServerConfig(data);
      }
    } catch (error) {
      console.error("Error fetching server config:", error);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/server-stats/health", {
        credentials: "include",
      });
      if (response.ok) {
        const data: ServerHealthInfo[] = await response.json();
        const map: Record<string, ServerHealthInfo> = {};
        data.forEach(h => {
          map[h.name] = h;
        });
        setHealthMap(map);
      }
    } catch (error) {
      console.error("Error fetching server health:", error);
    }
  }, []);

  useEffect(() => {
    fetchServerConfig();
  }, [fetchServerConfig]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <>
      <Box
        sx={{
          textAlign: isMobile ? "center" : "start",
          paddingBottom: "16px",
        }}
      >
        <Typography variant="h5">Models</Typography>
      </Box>
      {serverConfig.length > 0 && (
        <Grid container spacing={2}>
          {serverConfig.map((server) => {
            const health = healthMap[server.name];
            return (
              <Grid size={{ xs: 12 }} key={server.name}>
                <Card sx={{ bgcolor: "background.paper", boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: health?.healthy ? "#4caf50" : "#f44336",
                        }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {server.name}
                      </Typography>
                      {server.name === "Local" && (
                        <Chip label="Local" size="small" sx={{ fontSize: "0.65rem", height: 20 }} />
                      )}
                    </Box>
                    {server.models.map((model, mIdx) => {
                      const modelHealth = health?.models.find(mh => mh.name === model.name);
                      const contextLabel = model.contextLength ? `${Math.round(model.contextLength / 1000)}K` : "unknown";
                      return (
                        <Box
                          key={mIdx}
                          sx={{
                            p: 2,
                            mb: mIdx < server.models.length - 1 ? 1 : 0,
                            bgcolor: "action.hover",
                            borderRadius: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                bgcolor: modelHealth?.healthy ? "#4caf50" : "#f44336",
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {model.name}
                            </Typography>
                            <Chip label={`${contextLabel} ctx`} size="small" sx={{ fontSize: "0.6rem", height: 18, bgcolor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }} />
                            {model.provider && (
                              <Chip label={model.provider} size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
                            )}
                            {model.ownedBy && (
                              <Chip label={model.ownedBy} size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", color: "text.secondary", mb: 0.5 }}>
                            {model.url}
                          </Typography>
                          {modelHealth?.error && (
                            <Typography variant="caption" color="error" sx={{ display: "block" }}>
                              {modelHealth.error}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
};

export default Models;