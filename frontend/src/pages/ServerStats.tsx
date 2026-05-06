import React, { useState, useEffect, useCallback, useRef } from "react";
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
import GpuIcon from "../components/GpuIcon";
import CpuIcon from "../components/CpuIcon";
import RamIcon from "../components/RamIcon";
import InfoIcon from "@mui/icons-material/Info";
import StorageIcon from "@mui/icons-material/Storage";
import NetworkIoIcon from "../components/NetworkIoIcon";
import LoadGauge from "../components/LoadGauge";
import TempGauge from "../components/TempGauge";
import VramGauge from "../components/VramGauge";
import PowerGauge from "../components/PowerGauge";
import FanGauge from "../components/FanGauge";

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
  ranges: {
    tempMin: number;
    tempMax: number;
    powerMin: number;
    powerMax: number;
    fanMin: number;
    fanMax: number;
  };
}

interface ServerStatsData {
  cpu: {
    usage: number;
    loadAvg: number[];
    cores: CpuCore[];
    model: string;
    speed: number;
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
  currentModel?: string;
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

  const cpuHistoryRef = useRef<{ timestamp: number; value: number }[]>([]);
  const gpuHistoryRef = useRef<
    Record<number, { timestamp: number; value: number }[]>
  >({});
  const tempHistoryRef = useRef<
    Record<number, Record<number, { timestamp: number; value: number }[]>>
  >({});
  const powerHistoryRef = useRef<
    Record<number, { timestamp: number; value: number }[]>
  >({});
  const gpuRangesRef = useRef<
    Record<
      number,
      {
        tempMin: number;
        tempMax: number;
        powerMin: number;
        powerMax: number;
        fanMin: number;
        fanMax: number;
      }
    >
  >({});
  const lastSyncTimestampRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  const seedHistory = useCallback((history: ServerStatsData[]) => {
    for (const data of history) {
      cpuHistoryRef.current.push({
        timestamp: new Date(data.timestamp).getTime(),
        value: data.cpu.usage,
      });
      if (cpuHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
        cpuHistoryRef.current =
          cpuHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
      }

      for (let i = 0; i < data.gpu.gpus.length; i++) {
        if (!gpuHistoryRef.current[i]) {
          gpuHistoryRef.current[i] = [];
        }
        gpuHistoryRef.current[i].push({
          timestamp: new Date(data.timestamp).getTime(),
          value: data.gpu.gpus[i].utilization || 0,
        });
        if (gpuHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
          gpuHistoryRef.current[i] =
            gpuHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
        }

        if (!tempHistoryRef.current[i]) {
          tempHistoryRef.current[i] = {};
        }
        for (let j = 0; j < data.gpu.gpus[i].temperatures.length; j++) {
          if (!tempHistoryRef.current[i][j]) {
            tempHistoryRef.current[i][j] = [];
          }
          const tempVal = data.gpu.gpus[i].temperatures[j]?.value ?? 0;
          tempHistoryRef.current[i][j].push({
            timestamp: new Date(data.timestamp).getTime(),
            value: tempVal,
          });
          if (tempHistoryRef.current[i][j].length > MAX_SPARKLINE_POINTS) {
            tempHistoryRef.current[i][j] =
              tempHistoryRef.current[i][j].slice(-MAX_SPARKLINE_POINTS);
          }
        }

        if (!powerHistoryRef.current[i]) {
          powerHistoryRef.current[i] = [];
        }
        if (
          data.gpu.gpus[i].power !== null &&
          data.gpu.gpus[i].power !== undefined
        ) {
          powerHistoryRef.current[i].push({
            timestamp: new Date(data.timestamp).getTime(),
            value: data.gpu.gpus[i].power!,
          });
          if (powerHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
            powerHistoryRef.current[i] =
              powerHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
          }
        }
      }
    }
    const lastEntry = history[history.length - 1];
    if (lastEntry) {
      for (let i = 0; i < lastEntry.gpu.gpus.length; i++) {
        const gpu = lastEntry.gpu.gpus[i];
        const ranges = gpu.ranges;
        if (ranges) {
          gpuRangesRef.current[i] = ranges;
        } else {
          gpuRangesRef.current[i] = {
            tempMin:
              gpu.temperatures.length > 0 ? gpu.temperatures[0].value : 0,
            tempMax:
              gpu.temperatures.length > 0 ? gpu.temperatures[0].value : 1,
            powerMin: 0,
            powerMax: 1,
            fanMin: 0,
            fanMax: 1,
          };
        }
      }
    }
    if (history.length > 0) {
      lastSyncTimestampRef.current = new Date(
        history[history.length - 1].timestamp,
      ).getTime();
    }
    forceUpdate((n) => n + 1);
  }, []);

  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState !== "visible") return;

    const now = Date.now();
    const lastSync = lastSyncTimestampRef.current;
    if (lastSync === 0) return;

    const gapMs = now - lastSync;
    const POINT_INTERVAL = 2000;
    const pointsBehind = Math.floor(gapMs / POINT_INTERVAL);

    if (pointsBehind > 2) {
      try {
        const response = await fetch(
          `/api/server-stats/history?since=${lastSync}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const history: ServerStatsData[] = await response.json();
        if (history && history.length > 0) {
          seedHistory(history);
          lastSyncTimestampRef.current = new Date(
            history[history.length - 1].timestamp,
          ).getTime();
        }
      } catch {
        // silently fail
      }
    }
  }, [seedHistory]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleVisibilityChange]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/server-stats", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch server stats");
      const data: ServerStatsData = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
      lastSyncTimestampRef.current = new Date(data.timestamp).getTime();

      if (data) {
        cpuHistoryRef.current.push({
          timestamp: Date.now(),
          value: data.cpu.usage,
        });
        if (cpuHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
          cpuHistoryRef.current =
            cpuHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
        }

        if (!gpuHistoryRef.current[0]) {
          gpuHistoryRef.current[0] = [];
        }
        for (let i = 0; i < data.gpu.gpus.length; i++) {
          if (!gpuHistoryRef.current[i]) {
            gpuHistoryRef.current[i] = [];
          }
          gpuHistoryRef.current[i].push({
            timestamp: Date.now(),
            value: data.gpu.gpus[i].utilization || 0,
          });
          if (gpuHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
            gpuHistoryRef.current[i] =
              gpuHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
          }

          const ranges = data.gpu.gpus[i].ranges;
          if (ranges) {
            gpuRangesRef.current[i] = ranges;
          } else {
            gpuRangesRef.current[i] = {
              tempMin:
                data.gpu.gpus[i].temperatures.length > 0
                  ? data.gpu.gpus[i].temperatures[0].value
                  : 0,
              tempMax:
                data.gpu.gpus[i].temperatures.length > 0
                  ? data.gpu.gpus[i].temperatures[0].value
                  : 1,
              powerMin: 0,
              powerMax: 1,
              fanMin: 0,
              fanMax: 1,
            };
          }

          // Track per-sensor history
          if (!tempHistoryRef.current[i]) {
            tempHistoryRef.current[i] = {};
          }
          for (let j = 0; j < data.gpu.gpus[i].temperatures.length; j++) {
            if (!tempHistoryRef.current[i][j]) {
              tempHistoryRef.current[i][j] = [];
            }
            const tempVal = data.gpu.gpus[i].temperatures[j]?.value ?? 0;
            tempHistoryRef.current[i][j].push({
              timestamp: Date.now(),
              value: tempVal,
            });
            if (tempHistoryRef.current[i][j].length > MAX_SPARKLINE_POINTS) {
              tempHistoryRef.current[i][j] =
                tempHistoryRef.current[i][j].slice(-MAX_SPARKLINE_POINTS);
            }
          }

          if (!powerHistoryRef.current[i]) {
            powerHistoryRef.current[i] = [];
          }
          if (
            data.gpu.gpus[i].power !== null &&
            data.gpu.gpus[i].power !== undefined
          ) {
            powerHistoryRef.current[i].push({
              timestamp: Date.now(),
              value: data.gpu.gpus[i].power!,
            });
            if (powerHistoryRef.current[i].length > MAX_SPARKLINE_POINTS) {
              powerHistoryRef.current[i] =
                powerHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
            }
          }
        }
        forceUpdate((n) => n + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetch("/api/server-stats/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((history: ServerStatsData[]) => {
        if (history && history.length > 0) {
          seedHistory(history);
          lastSyncTimestampRef.current = new Date(
            history[history.length - 1].timestamp,
          ).getTime();
        }
      })
      .catch(() => {});
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [fetchStats, seedHistory]);

  const secondsAgo = (): string => {
    if (!lastUpdated) return "";
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    return `${diff}s ago`;
  };

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

  if (!stats) {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">Server Stats</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              size="small"
              label="Connecting..."
              sx={{
                bgcolor: "warning.light",
                color: "warning.contrastText",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
            <CircularProgress size={16} />
          </Box>
        </Box>
      </>
    );
  }

  const cpuUsage = stats.cpu.usage;
  const ramUsage = stats.ram.usedPercent;
  const dbSize = stats.database.sizeHuman;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h5">Server Stats</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchStats} size="small">
              <RefreshIcon
                sx={{
                  color: "text.secondary",
                  ...(loading
                    ? { animation: `${spin} 1s linear infinite` }
                    : {}),
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <StatsCard title="GPU" icon={<GpuIcon />}>
            {stats.gpu.gpuAvailable ? (
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
                          const range = gpuRangesRef.current[idx] ?? {
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
                            globalMin={gpuRangesRef.current[idx]?.powerMin ?? 0}
                            globalMax={gpuRangesRef.current[idx]?.powerMax ?? 1}
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
                              globalMin={gpuRangesRef.current[idx]?.fanMin ?? 0}
                              globalMax={gpuRangesRef.current[idx]?.fanMax ?? 1}
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
            )}
          </StatsCard>
        </Grid>

        {stats.cpu.cores.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <StatsCard title="CPU" icon={<CpuIcon />}>
              <LoadGauge
                value={cpuUsage}
                color={getGaugeColor(cpuUsage)}
                sparklineData={cpuHistoryRef.current}
              />
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  marginTop: 2,
                }}
              >
                {stats.cpu.cores.map((core, idx) => (
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
                ))}
              </Box>
            </StatsCard>
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 6 }}>
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
                  {stats.network.bytesSentHuman}
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
                  {stats.network.bytesReceivedHuman}
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
                  {stats.network.bytesSentHuman} +{" "}
                  {stats.network.bytesReceivedHuman}
                </Typography>
              </Box>
            </Box>
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
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
              sx={{ mt: 1.5, display: "flex", justifyContent: "space-between" }}
            >
              <Typography variant="caption" color="text.secondary">
                {stats.ram.used} / {stats.ram.total} GB
              </Typography>
              {stats.ram.swapTotal > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Swap: {stats.ram.swapUsed} GB
                </Typography>
              )}
            </Box>
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <StatsCard title="System Info" icon={<InfoIcon />}>
            <Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  CPU
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, textAlign: "right" }}
                >
                  {isMobile
                    ? stats.cpu.model.split(" ").slice(0, 3).join(" ") + "..."
                    : stats.cpu.model}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  CPU Speed
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {stats.cpu.speed} MHz
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Cores
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {stats.cpu.cores.length}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  GPU
                </Typography>
                <Chip
                  size="small"
                  label={stats.gpu.gpuAvailable ? "Available" : "Not Found"}
                  sx={{
                    bgcolor: stats.gpu.gpuAvailable
                      ? "success.light"
                      : "grey.300",
                    color: stats.gpu.gpuAvailable ? "white" : "text.secondary",
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
                  {stats.platform === "linux" ? "Linux" : stats.platform}
                </Typography>
              </Box>
              {stats.currentModel && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Model
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      textAlign: "right",
                      maxWidth: "60%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={stats.currentModel}
                  >
                    {stats.currentModel}
                  </Typography>
                </Box>
              )}
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Server Time
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {new Date(stats.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
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
        </Grid>
      </Grid>
    </>
  );
};

export default ServerStats;
