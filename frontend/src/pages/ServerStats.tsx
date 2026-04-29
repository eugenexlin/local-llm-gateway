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

const spin = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});
import RefreshIcon from "@mui/icons-material/Refresh";
import MemoryIcon from "@mui/icons-material/Memory";
import SpeedIcon from "@mui/icons-material/Speed";
import StorageIcon from "@mui/icons-material/Storage";
import NetworkPingIcon from "@mui/icons-material/NetworkPing";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import LoadGauge from "../components/LoadGauge";
import TempGauge from "../components/TempGauge";

interface CpuCore {
  cpu: number;
  brand: string;
  speed: number;
  load: number;
}

interface GpuDetail {
  name: string;
  temperatures: number[];
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
          <Box sx={{ color: "primary.main" }}>{icon}</Box>
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

const getTempColor = (temp: number | null): string => {
  if (temp === null) return "#9e9e9e";
  if (temp >= 85) return "#d32f2f";
  if (temp >= 75) return "#f57c00";
  return "#2e7d32";
};

const getDbSizeColor = (size: number): string => {
  if (size < 100 * 1024 * 1024) return "#2e7d32";
  if (size < 1024 * 1024 * 1024) return "#f57c00";
  return "#d32f2f";
};

const ServerStats: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [stats, setStats] = useState<ServerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cpuHistoryRef = useRef<{ timestamp: number; value: number }[]>([]);
  const gpuHistoryRef = useRef<Record<number, { timestamp: number; value: number }[]>>({});
  const tempRangeRef = useRef<Record<number, { min: number; max: number }>>({});
  const tempHistoryRef = useRef<Record<number, Record<number, { timestamp: number; value: number }[]>>>({});
  const [, forceUpdate] = useState(0);

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

      if (data) {
        cpuHistoryRef.current.push({
          timestamp: Date.now(),
          value: data.cpu.usage,
        });
        if (cpuHistoryRef.current.length > MAX_SPARKLINE_POINTS) {
          cpuHistoryRef.current = cpuHistoryRef.current.slice(-MAX_SPARKLINE_POINTS);
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
            gpuHistoryRef.current[i] = gpuHistoryRef.current[i].slice(-MAX_SPARKLINE_POINTS);
          }

          // Track temp range (unified across all sensors per GPU)
          if (!tempRangeRef.current[i]) {
            if (data.gpu.gpus[i].temperatures.length > 0) {
              tempRangeRef.current[i] = {
                min: data.gpu.gpus[i].temperatures[0] - 1,
                max: data.gpu.gpus[i].temperatures[0] + 1,
              };
            } else {
              tempRangeRef.current[i] = { min: 0, max: 100 };
            }
          }

          // Update global min/max from all sensors
          for (const temp of data.gpu.gpus[i].temperatures) {
            if (temp !== null && temp !== undefined) {
              tempRangeRef.current[i].min = Math.min(tempRangeRef.current[i].min, temp);
              tempRangeRef.current[i].max = Math.max(tempRangeRef.current[i].max, temp);
            }
          }

          // Track per-sensor history
          if (!tempHistoryRef.current[i]) {
            tempHistoryRef.current[i] = {};
          }
          for (let j = 0; j < data.gpu.gpus[i].temperatures.length; j++) {
            if (!tempHistoryRef.current[i][j]) {
              tempHistoryRef.current[i][j] = [];
            }
            const tempVal = data.gpu.gpus[i].temperatures[j] ?? 0;
            tempHistoryRef.current[i][j].push({ timestamp: Date.now(), value: tempVal });
            if (tempHistoryRef.current[i][j].length > MAX_SPARKLINE_POINTS) {
              tempHistoryRef.current[i][j] = tempHistoryRef.current[i][j].slice(-MAX_SPARKLINE_POINTS);
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
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [fetchStats]);

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
          <Chip
            size="small"
            label={
              lastUpdated
                ? `Updated ${secondsAgo()}`
                : loading
                  ? "Connecting..."
                  : "Error"
            }
            sx={{
              bgcolor: lastUpdated
                ? "success.light"
                : loading
                  ? "warning.light"
                  : "error.light",
              color: lastUpdated
                ? "success.contrastText"
                : loading
                  ? "warning.contrastText"
                  : "error.contrastText",
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
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
          <StatsCard title="GPU" icon={<PowerSettingsNewIcon />}>
            {stats.gpu.gpuAvailable ? (
              <Box>
                {stats.gpu.gpus.map((gpu, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      mb: idx < stats.gpu.gpus.length - 1 ? 2 : 0,
                      pb: idx < stats.gpu.gpus.length - 1 ? 2 : 0,
                      ...(idx < stats.gpu.gpus.length - 1
                        ? { borderBottom: `1px solid ${theme.palette.divider}` }
                        : {}),
                    }}
                  >
                    <LoadGauge
                      title={gpu.name}
                      value={gpu.utilization}
                      color={getTempColor(gpu.temperatures[0] ?? null)}
                      sparklineData={gpuHistoryRef.current[idx] || []}
                      extraContent={
                        <Box>
                          {gpu.temperatures.length === 0 ? (
                            <TempGauge
                              title="Temp 1"
                              value={null}
                              history={[]}
                              globalMin={0}
                              globalMax={100}
                              color="#9e9e9e"
                            />
                          ) : (
                            gpu.temperatures.map((temp, j) => {
                              const range = tempRangeRef.current[idx] ?? { min: 0, max: 100 };
                              return (
                                <Box
                                  key={j}
                                  sx={{
                                    mb: j < gpu.temperatures.length - 1 ? 2 : 0,
                                    pb: j < gpu.temperatures.length - 1 ? 2 : 0,
                                    ...(j < gpu.temperatures.length - 1
                                      ? { borderBottom: `1px solid ${theme.palette.divider}` }
                                      : {}),
                                  }}
                                >
                                  <TempGauge
                                    title={`Temp ${j + 1}`}
                                    value={temp}
                                    history={tempHistoryRef.current[idx]?.[j] || []}
                                    globalMin={range.min}
                                    globalMax={range.max}
                                    color={getTempColor(temp)}
                                  />
                                </Box>
                              );
                            })
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1,
                              mt: 2,
                            }}
                          >
                            {[
                              {
                                label: "VRAM",
                                value: gpu.memUsed !== null
                                  ? `${gpu.memUsed} / ${gpu.memTotal} GB`
                                  : "N/A",
                                usagePercent: gpu.memUsed !== null && gpu.memTotal !== null
                                  ? (gpu.memUsed / gpu.memTotal) * 100
                                  : 0,
                              },
                              {
                                label: "Power",
                                value: gpu.power !== null ? `${gpu.power}W` : "N/A",
                              },
                              {
                                label: "Fan",
                                value: gpu.fanSpeed !== null ? `${gpu.fanSpeed} RPM` : "N/A",
                              },
                            ].map((stat) => (
                              <Box
                                key={stat.label}
                                sx={{
                                  flex: "1 1 calc(33.333% - 8px)",
                                  minWidth: 120,
                                  textAlign: "center",
                                  [theme.breakpoints.down("sm")]: {
                                    flex: "1 1 calc(50% - 8px)",
                                  },
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 500, display: "block" }}
                                >
                                  {stat.label}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600, display: "block", mt: 0.5 }}
                                >
                                  {stat.value}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                  </Box>
                ))}
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
            <StatsCard title="CPU" icon={<SpeedIcon />}>
              <LoadGauge
                title="CPU"
                value={cpuUsage}
                color={
                  cpuUsage >= 85
                    ? "#d32f2f"
                    : cpuUsage >= 70
                      ? "#f57c00"
                      : "#2e7d32"
                }
                sparklineData={cpuHistoryRef.current}
                extraContent={
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Per-Core CPU Load
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.cpu.cores.length} cores
                      </Typography>
                    </Box>
                    <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
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
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Core {idx}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color:
                            core.load >= 85
                              ? "#d32f2f"
                              : core.load >= 70
                                ? "#f57c00"
                                : "#2e7d32",
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
                  </>
                }
              />
            </StatsCard>
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 6 }}>
          <StatsCard title="Network I/O" icon={<NetworkPingIcon />}>
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
          <StatsCard title="RAM" icon={<MemoryIcon />}>
            <Box sx={{ textAlign: "center", mb: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color:
                    ramUsage >= 85
                      ? "#d32f2f"
                      : ramUsage >= 70
                        ? "#f57c00"
                        : "#2e7d32",
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
                  bgcolor:
                    ramUsage >= 85
                      ? "#d32f2f"
                      : ramUsage >= 70
                        ? "#f57c00"
                        : "#2e7d32",
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
          <StatsCard title="App Uptime" icon={<PowerSettingsNewIcon />}>
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
                  color: getDbSizeColor(stats.database.size),
                }}
              >
                {dbSize}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(
                100,
                (stats.database.size / (2 * 1024 * 1024 * 1024)) * 100,
              )}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "rgba(0,0,0,0.06)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  bgcolor: getDbSizeColor(stats.database.size),
                },
              }}
            />
          </StatsCard>
        </Grid>
      </Grid>
    </>
  );
};

export default ServerStats;
