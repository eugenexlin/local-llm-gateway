import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  keyframes,
} from "@mui/material";
import { MAX_SPARKLINE_POINTS } from "../utils/constants";
import { getGaugeColor } from "../utils/colors";

const spin = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});
import RefreshIcon from "@mui/icons-material/Refresh";
import GpuIcon from "../components/icons/GpuIcon";
import CpuIcon from "../components/icons/CpuIcon";
import RamIcon from "../components/icons/RamIcon";
import InfoIcon from "@mui/icons-material/Info";
import StorageIcon from "@mui/icons-material/Storage";
import NetworkIoIcon from "../components/icons/NetworkIoIcon";
import ServerFilter from "../components/ui/ServerFilter";
import { useServerContext } from "../context/ServerContext";
import LoadGauge from "../components/gauges/LoadGauge";
import TempGauge from "../components/gauges/TempGauge";
import VramGauge from "../components/gauges/VramGauge";
import PowerGauge from "../components/gauges/PowerGauge";
import FanGauge from "../components/gauges/FanGauge";

interface CpuCore {
  cpu: number;
  brand: string;
  speed: number;
  load: number;
}

interface GpuDetail {
  name: string;
  temperatures: Array<{ value: number; label?: string }>;
  fanSpeed: number | null;
  power: number | null;
  memUsed: number | null;
  memTotal: number | null;
  utilization: number | null;
}

interface ServerStatsData {
  cpu: {
    usage: number;
    loadAvg: number[];
    cores: CpuCore[];
    model: string;
    speed: number;
    temperature?: {
      main: number | null;
      cores: number[];
      max: number | null;
    };
  };
  ram: {
    used: number;
    total: number;
    usedPercent: number;
    swapUsed: number;
    swapTotal: number;
  };
  gpu: {
    gpuAvailable: boolean;
    gpus: GpuDetail[];
    ranges?: {
      tempMin: number;
      tempMax: number;
      powerMin: number;
      powerMax: number;
      fanMin: number;
      fanMax: number;
    };
  };
  database: {
    path: string;
    size: number;
    sizeHuman: string;
    lastModified: string | null;
    totalRequests: number;
  };
  network: {
    bytesSent: number;
    bytesReceived: number;
    bytesSentHuman: string;
    bytesReceivedHuman: string;
  };
  platform: string;
  timestamp: string;
}

interface StatsCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  sx?: Record<string, unknown>;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, icon, children, sx }) => {
  return (
    <Card
      sx={{
        height: "100%",
        bgcolor: "background.paper",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)",
        ...sx,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            gap: 1,
          }}
        >
          <Box
            sx={{
              color: "primary.main",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
};

const ServerStats: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [stats, setStats] = useState<ServerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);
  const { serverConfig } = useServerContext();

  const cpuHistoryRef = useRef<{ timestamp: number; value: number }[]>([]);
  const cpuTempHistoryRef = useRef<{ timestamp: number; value: number }[]>([]);
  const gpuHistoryRef = useRef<
    Record<number, { timestamp: number; value: number }[]>
  >({});
  const tempHistoryRef = useRef<
    Record<number, Record<number, { timestamp: number; value: number }[]>>
  >({});
  const powerHistoryRef = useRef<
    Record<number, { timestamp: number; value: number }[]>
  >({});
  const gpuRangesRef = useRef<{
    tempMin: number;
    tempMax: number;
    powerMin: number;
    powerMax: number;
    fanMin: number;
    fanMax: number;
  } | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const [, forceUpdate] = useState(0);

  const resetHistory = useCallback((history: ServerStatsData[]) => {
    cpuHistoryRef.current = [];
    cpuTempHistoryRef.current = [];
    gpuHistoryRef.current = {};
    tempHistoryRef.current = {};
    powerHistoryRef.current = {};
    gpuRangesRef.current = null;

    for (const data of history) {
      const ts = new Date(data.timestamp).getTime();
      cpuHistoryRef.current.push({
        timestamp: ts,
        value: data.cpu.usage,
      });
      if (cpuHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
        cpuHistoryRef.current = cpuHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
      }

      if (data.cpu.temperature?.main !== null && data.cpu.temperature?.main !== undefined) {
        cpuTempHistoryRef.current.push({
          timestamp: ts,
          value: data.cpu.temperature.main,
        });
        if (cpuTempHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
          cpuTempHistoryRef.current = cpuTempHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
        }
      }

      for (let i = 0; i < data.gpu.gpus.length; i++) {
        if (!gpuHistoryRef.current[i]) gpuHistoryRef.current[i] = [];
        gpuHistoryRef.current[i].push({
          timestamp: ts,
          value: data.gpu.gpus[i].utilization || 0,
        });
        if (gpuHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
          gpuHistoryRef.current[i] = gpuHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
        }

        if (!tempHistoryRef.current[i]) tempHistoryRef.current[i] = {};
        for (let j = 0; j < data.gpu.gpus[i].temperatures.length; j++) {
          if (!tempHistoryRef.current[i][j]) tempHistoryRef.current[i][j] = [];
          const tempVal = data.gpu.gpus[i].temperatures[j]?.value ?? 0;
          tempHistoryRef.current[i][j].push({ timestamp: ts, value: tempVal });
          if (tempHistoryRef.current[i][j].length > MAX_SPARKLINE_POINTS) {
            tempHistoryRef.current[i][j] = tempHistoryRef.current[i][j].slice(-MAX_SPARKLINE_POINTS);
          }
        }

        if (!powerHistoryRef.current[i]) powerHistoryRef.current[i] = [];
        if (data.gpu.gpus[i].power !== null && data.gpu.gpus[i].power !== undefined) {
          powerHistoryRef.current[i].push({ timestamp: ts, value: data.gpu.gpus[i].power! });
          if (powerHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
            powerHistoryRef.current[i] = powerHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
          }
        }
      }
    }

    const lastEntry = history[history.length - 1];
    if (lastEntry) {
      const ranges = lastEntry.gpu.ranges;
      gpuRangesRef.current = ranges ?? {
        tempMin: 0,
        tempMax: 1,
        powerMin: 0,
        powerMax: 1,
        fanMin: 0,
        fanMax: 1,
      };
      setStats(lastEntry);
      setLastUpdated(new Date());
      lastSyncTimestampRef.current = new Date(lastEntry.timestamp).getTime();
    }
    forceUpdate((n) => n + 1);
  }, []);

  const appendHistory = useCallback((newItems: ServerStatsData[]) => {
    if (newItems.length === 0) return;

    const lastTs = lastSyncTimestampRef.current;
    const items = lastTs > 0 ? newItems.filter((d) => new Date(d.timestamp).getTime() > lastTs) : newItems;
    if (items.length === 0) return;

    for (const data of items) {
      const ts = new Date(data.timestamp).getTime();
      cpuHistoryRef.current.push({ timestamp: ts, value: data.cpu.usage });
      if (cpuHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
        cpuHistoryRef.current = cpuHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
      }

      if (data.cpu.temperature?.main !== null && data.cpu.temperature?.main !== undefined) {
        cpuTempHistoryRef.current.push({ timestamp: ts, value: data.cpu.temperature.main });
        if (cpuTempHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
          cpuTempHistoryRef.current = cpuTempHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
        }
      }

      for (let i = 0; i < data.gpu.gpus.length; i++) {
        if (!gpuHistoryRef.current[i]) gpuHistoryRef.current[i] = [];
        gpuHistoryRef.current[i].push({ timestamp: ts, value: data.gpu.gpus[i].utilization || 0 });
        if (gpuHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
          gpuHistoryRef.current[i] = gpuHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
        }

        if (!tempHistoryRef.current[i]) tempHistoryRef.current[i] = {};
        for (let j = 0; j < data.gpu.gpus[i].temperatures.length; j++) {
          if (!tempHistoryRef.current[i][j]) tempHistoryRef.current[i][j] = [];
          const tempVal = data.gpu.gpus[i].temperatures[j]?.value ?? 0;
          tempHistoryRef.current[i][j].push({ timestamp: ts, value: tempVal });
          if (tempHistoryRef.current[i][j].length > MAX_SPARKLINE_POINTS) {
            tempHistoryRef.current[i][j] = tempHistoryRef.current[i][j].slice(-MAX_SPARKLINE_POINTS);
          }
        }

        if (!powerHistoryRef.current[i]) powerHistoryRef.current[i] = [];
        if (data.gpu.gpus[i].power !== null && data.gpu.gpus[i].power !== undefined) {
          powerHistoryRef.current[i].push({ timestamp: ts, value: data.gpu.gpus[i].power! });
          if (powerHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
            powerHistoryRef.current[i] = powerHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
          }
        }
      }
    }
    const lastEntry = items[items.length - 1];
    if (lastEntry) {
      const ranges = lastEntry.gpu.ranges;
      gpuRangesRef.current = ranges ?? {
        tempMin: 0,
        tempMax: 1,
        powerMin: 0,
        powerMax: 1,
        fanMin: 0,
        fanMax: 1,
      };
      setStats(lastEntry);
      setLastUpdated(new Date());
      lastSyncTimestampRef.current = new Date(lastEntry.timestamp).getTime();
    }
    forceUpdate((n) => n + 1);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!selectedServerName || isSyncingRef.current) return;
    try {
      const response = await fetch(`/api/server-stats?server=${selectedServerName}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch server stats");
      const data: ServerStatsData = await response.json();
      setError(null);
      appendHistory([data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedServerName, appendHistory]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      fetchStats();
    }, 2000);
  }, [fetchStats, stopPolling]);

  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === "hidden") {
      stopPolling();
      return;
    }

    if (document.visibilityState !== "visible" || !selectedServerName) return;

    const now = Date.now();
    const lastSync = lastSyncTimestampRef.current;
    const RETENTION_MS = MAX_SPARKLINE_POINTS * 2000;

    isSyncingRef.current = true;
    try {
      if (lastSync === 0 || now - lastSync > RETENTION_MS) {
        const response = await fetch(
          `/api/server-stats/history?server=${selectedServerName}`,
          { credentials: "include", cache: "no-store" },
        );
        if (response.ok) {
          const history: ServerStatsData[] = await response.json();
          if (history && history.length > 0) {
            resetHistory(history);
          }
        }
      } else if (now - lastSync >= 4000) {
        const response = await fetch(
          `/api/server-stats/history?server=${selectedServerName}&since=${lastSync}`,
          { credentials: "include", cache: "no-store" },
        );
        if (response.ok) {
          const history: ServerStatsData[] = await response.json();
          if (history && history.length > 0) {
            appendHistory(history);
          }
        }
      } else {
        await fetchStats();
      }
    } catch {
      // silently fail
    } finally {
      isSyncingRef.current = false;
      startPolling();
    }
  }, [appendHistory, fetchStats, resetHistory, selectedServerName, startPolling, stopPolling]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    if (selectedServerName || serverConfig.length === 0) return;
    const localServer = serverConfig.find((s) => s.name === "Local") || serverConfig[0];
    if (localServer) {
      setSelectedServerName(localServer.name);
    }
  }, [serverConfig, selectedServerName]);

  useEffect(() => {
    if (!selectedServerName) return;

    stopPolling();
    cpuHistoryRef.current = [];
    cpuTempHistoryRef.current = [];
    gpuHistoryRef.current = {};
    tempHistoryRef.current = {};
    powerHistoryRef.current = {};
    gpuRangesRef.current = null;
    lastSyncTimestampRef.current = 0;
    setLoading(true);

    fetch(`/api/server-stats/history?server=${selectedServerName}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((history: ServerStatsData[]) => {
        if (history && history.length > 0) {
          resetHistory(history);
        } else {
          fetchStats();
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      })
      .finally(() => {
        setLoading(false);
        if (document.visibilityState === "visible") {
          startPolling();
        }
      });

    return () => {
      stopPolling();
    };
  }, [fetchStats, resetHistory, selectedServerName, startPolling, stopPolling]);

  if (error && !stats) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={fetchStats} sx={{ mt: 2 }}>
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  const cpuUsage = stats?.cpu.usage ?? 0;
  const ramUsage = stats?.ram.usedPercent ?? 0;
  const dbSize = stats?.database.sizeHuman ?? "N/A";

  const loadingSection = () => {
    return (
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress aria-label="Loading…" />
      </Box>
    );
  };

  const gpuSection = (stats: ServerStatsData | null) => {
    return (
      <Grid size={{ xs: 12 }}>
        <StatsCard title="GPU" icon={<GpuIcon />}>
          {!stats && loadingSection()}
          {stats !== null &&
            (stats.gpu.gpuAvailable ? (
              <Box>
                {stats.gpu.gpus.map((gpu, idx) => {
                  return (
                    <Box sx={{ mb: 2 }} key={idx}>
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {gpu.name}
                        </Typography>
                      </Box>
                      <LoadGauge
                        value={gpu.utilization}
                        color={getGaugeColor(gpu.utilization)}
                        sparklineData={gpuHistoryRef.current[idx] || []}
                      />
                      <Box>
                        {(gpu.temperatures.length >= 1
                          ? gpu.temperatures
                          : [{ value: null, label: "N/A" }]
                        ).map((temp, j) => {
                          const range = gpuRangesRef.current ?? {
                            tempMin: 0,
                            tempMax: 1,
                            powerMin: 0,
                            powerMax: 1,
                            fanMin: 0,
                            fanMax: 1,
                          };
                          const tempPercent =
                            temp.value !== null
                              ? Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    ((temp.value - range.tempMin) /
                                      (range.tempMax - range.tempMin)) *
                                      100,
                                  ),
                                )
                              : null;
                          const title = `temp${j + 1} - ${temp.label}`;
                          return (
                            <Box key={j} sx={{}}>
                              <TempGauge
                                title={title}
                                value={temp.value}
                                history={tempHistoryRef.current[idx]?.[j] || []}
                                globalMin={range.tempMin}
                                globalMax={range.tempMax}
                                color={getGaugeColor(tempPercent)}
                              />
                            </Box>
                          );
                        })}
                        <Box sx={{}}>
                          <PowerGauge
                            value={gpu.power}
                            history={powerHistoryRef.current[idx] || []}
                            globalMin={gpuRangesRef.current?.powerMin ?? 0}
                            globalMax={gpuRangesRef.current?.powerMax ?? 1}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 2,
                            mt: 1,
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              flex: "1 1 calc(50% - 8px)",
                              minWidth: 140,
                            }}
                          >
                            <VramGauge
                              value={gpu.memUsed}
                              total={gpu.memTotal}
                            />
                          </Box>
                          <Box
                            sx={{
                              flex: "1 1 calc(50% - 8px)",
                              minWidth: 160,
                            }}
                          >
                            <FanGauge
                              value={gpu.fanSpeed}
                              globalMin={gpuRangesRef.current?.fanMin ?? 0}
                              globalMax={gpuRangesRef.current?.fanMax ?? 1}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "text.secondary", py: 2 }}
              >
                No GPUs detected
              </Typography>
            ))}
        </StatsCard>
      </Grid>
    );
  };

  const cpuSection = (stats: ServerStatsData | null) => {
    const cpuTemp = stats?.cpu.temperature?.main ?? null;
    const cpuTempMax = stats?.cpu.temperature?.max ?? 90;
    const hasCoreTemps = (stats?.cpu.temperature?.cores?.length ?? 0) > 0;

    return (
      <Grid size={{ xs: 12 }}>
        <StatsCard title="CPU" icon={<CpuIcon />}>
          {!stats && loadingSection()}
          {stats !== null && stats.cpu.cores.length > 0 && (
            <>
              <LoadGauge
                value={cpuUsage}
                color={getGaugeColor(cpuUsage)}
                sparklineData={cpuHistoryRef.current}
              />
              {cpuTemp !== null && (
                <Box sx={{ mt: 2 }}>
                  <TempGauge
                    title="Temperature"
                    value={cpuTemp}
                    history={cpuTempHistoryRef.current}
                    globalMin={30}
                    globalMax={Math.max(90, Math.round(cpuTempMax))}
                    color={getGaugeColor(
                      Math.min(
                        100,
                        Math.max(
                          0,
                          ((cpuTemp - 30) / (Math.max(90, cpuTempMax) - 30)) * 100,
                        ),
                      ),
                    )}
                  />
                </Box>
              )}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  marginTop: 2,
                }}
              >
                {stats.cpu.cores.map((core, idx) => {
                  const coreTemp = hasCoreTemps ? stats.cpu.temperature?.cores?.[idx] : null;
                  return (
                    <Box
                      key={idx}
                      sx={{
                        flex: "1 1 calc(25% - 8px)",
                        minWidth: 120,
                        [theme.breakpoints.down("sm")]: {
                          flex: "1 1 calc(50% - 8px)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          Core {idx}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {coreTemp !== null && coreTemp !== undefined && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 500,
                                color: getGaugeColor(
                                  Math.min(
                                    100,
                                    Math.max(0, ((coreTemp - 30) / 60) * 100),
                                  ),
                                ),
                              }}
                            >
                              {coreTemp.toFixed(1)}°C
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: getGaugeColor(core.load),
                            }}
                          >
                            {core.load.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={core.load}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "rgba(0,0,0,0.06)",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor:
                              core.load >= 85
                                ? "#d32f2f"
                                : core.load >= 70
                                  ? "#f57c00"
                                  : "#2e7d32",
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </StatsCard>
      </Grid>
    );
  };

  const otherSection = (stats: ServerStatsData | null) => {
    return [
      <Grid size={{ xs: 12, sm: 6 }} key="ram">
        <StatsCard title="RAM" icon={<RamIcon />}>
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: getGaugeColor(ramUsage),
              }}
            >
              {ramUsage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={ramUsage}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "rgba(0,0,0,0.06)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                bgcolor: getGaugeColor(ramUsage),
              },
            }}
          />
          <Box
            sx={{
              mt: 1.5,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {stats?.ram.used ?? 0} / {stats?.ram.total ?? 0} GB
            </Typography>
            {(stats?.ram.swapTotal ?? 0) > 0 && (
              <Typography variant="caption" color="text.secondary">
                Swap: {stats?.ram.swapUsed ?? 0} GB
              </Typography>
            )}
          </Box>
        </StatsCard>
      </Grid>,
      <Grid size={{ xs: 12, sm: 6 }}  key="db">
        <StatsCard title="Database" icon={<StorageIcon />}>
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: "#2e7d32",
              }}
            >
              {dbSize}
            </Typography>
          </Box>
        </StatsCard>
      </Grid>,
      <Grid size={{ xs: 12, sm: 6 }}  key="io">
        <StatsCard title="Network I/O" icon={<NetworkIoIcon />}>
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Upload
                </Typography>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#4caf50",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {stats?.network.bytesSentHuman}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Download
                </Typography>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#2196f3",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {stats?.network.bytesReceivedHuman}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {stats?.network.bytesSentHuman} +{" "}
                {stats?.network.bytesReceivedHuman}
              </Typography>
            </Box>
          </Box>
        </StatsCard>
      </Grid>,
      <Grid size={{ xs: 12, sm: 6 }}  key="sys">
        <StatsCard title="System Info" icon={<InfoIcon />}>
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                CPU
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, textAlign: "right" }}
              >
                {isMobile
                  ? stats?.cpu.model.split(" ").slice(0, 3).join(" ") + "..."
                  : stats?.cpu.model}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                CPU Speed
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {stats !== null ? `${stats.cpu.speed}MHz` : ""}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Cores
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {stats?.cpu.cores.length}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                GPU
              </Typography>
              <Chip
                size="small"
                label={stats?.gpu.gpuAvailable ? "Available" : "Not Found"}
                sx={{
                  bgcolor: stats?.gpu.gpuAvailable
                    ? "success.light"
                    : "grey.300",
                  color: stats?.gpu.gpuAvailable ? "white" : "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Platform
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {stats?.platform === "linux" ? "Linux" : stats?.platform}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Server Time
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {stats !== null
                  ? new Date(stats.timestamp).toLocaleString()
                  : ""}
              </Typography>
            </Box>
          </Box>
        </StatsCard>
      </Grid>,
    ];
  };

  const selectedServer = serverConfig.find(s => s.name === selectedServerName);
  const isLocal = selectedServer?.name === "Local";

  return (
    <>
      <Box
        sx={{
          textAlign: isMobile ? "center" : "start",
          paddingBottom: "16px",
        }}
      >
        <Typography variant="h5">Server Stats</Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        <ServerFilter
          selectedServerName={selectedServerName}
          onServerChange={setSelectedServerName}
        />
      </Box>
      {selectedServer ? (
        <Grid container spacing={2}>
          {gpuSection(stats)}
          {cpuSection(stats)}
          {otherSection(stats)}
        </Grid>
      ) : null}
      
    </>
  );
};

export default ServerStats;
