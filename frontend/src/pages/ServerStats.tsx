import React, { useState, useEffect, useCallback } from "react";
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
import DnsIcon from "@mui/icons-material/Dns";

interface CpuCore {
  cpu: number;
  brand: string;
  speed: number;
  load: number;
}

interface GpuDetail {
  name: string;
  temperature: number | null;
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
    rocmAvailable: boolean;
    gpus: GpuDetail[];
  };
  database: {
    path: string;
    size: number;
    sizeHuman: string;
    lastModified: string | null;
    totalRequests: number;
  };
  process: {
    rss: number;
    rssHuman: string;
    heapUsed: number;
    heapUsedHuman: string;
    heapTotal: number;
    heapTotalHuman: string;
    uptime: number;
    uptimeHuman: string;
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
  if (temp === null) return "text.secondary";
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

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/server-stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch server stats");
      const data: ServerStatsData = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const secondsAgo = (): string => {
    if (!lastUpdated) return "";
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    return `${diff}s ago`;
  };

  if (loading && !stats) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading server stats...
        </Typography>
      </Box>
    );
  }

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

  if (!stats) return null;

  const cpuUsage = stats.cpu.usage;
  const ramUsage = stats.ram.usedPercent;
  const uptime = stats.process.uptimeHuman;
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
            label={lastUpdated ? `Updated ${secondsAgo()}` : "Connecting..."}
            sx={{
              bgcolor: lastUpdated ? "success.light" : "warning.light",
              color: lastUpdated
                ? "success.contrastText"
                : "warning.contrastText",
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard title="CPU" icon={<SpeedIcon />}>
            <Box sx={{ textAlign: "center", mb: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color:
                    cpuUsage >= 85
                      ? "#d32f2f"
                      : cpuUsage >= 70
                        ? "#f57c00"
                        : "#2e7d32",
                }}
              >
                {cpuUsage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={cpuUsage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "rgba(0,0,0,0.06)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  bgcolor:
                    cpuUsage >= 85
                      ? "#d32f2f"
                      : cpuUsage >= 70
                        ? "#f57c00"
                        : "#2e7d32",
                },
              }}
            />
            <Box
              sx={{ mt: 1.5, display: "flex", justifyContent: "space-between" }}
            >
              <Typography variant="caption" color="text.secondary">
                Load: {stats.cpu.loadAvg[0].toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.cpu.cores.length} cores
              </Typography>
            </Box>
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard title="GPU" icon={<PowerSettingsNewIcon />}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1,
              }}
            >
              {stats.gpu.rocmAvailable ? (
                <>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: "#2e7d32" }}
                  >
                    {stats.gpu.gpus.length}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ ml: 1, color: "text.secondary" }}
                  >
                    detected
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 600, color: "text.secondary" }}
                >
                  No ROCm
                </Typography>
              )}
            </Box>
            {stats.gpu.rocmAvailable &&
              stats.gpu.gpus.slice(0, 3).map((gpu, idx) => (
                <Box
                  key={idx}
                  sx={{ mb: idx < stats.gpu.gpus.length - 1 ? 1.5 : 0 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {gpu.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${gpu.temperature}°C`}
                      sx={{
                        bgcolor: getTempColor(gpu.temperature),
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.65rem",
                        height: 22,
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={gpu.utilization || 0}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "rgba(0,0,0,0.06)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 3,
                        bgcolor: getTempColor(gpu.temperature),
                      },
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {gpu.memUsed !== null
                        ? `${gpu.memUsed} / ${gpu.memTotal} GB VRAM`
                        : "VRAM N/A"}
                    </Typography>
                    {gpu.power !== null && (
                      <Typography variant="caption" color="text.secondary">
                        {gpu.power}W
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            {stats.gpu.rocmAvailable && stats.gpu.gpus.length > 3 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                +{stats.gpu.gpus.length - 3} more GPU
                {stats.gpu.gpus.length - 3 > 1 ? "s" : ""}
              </Typography>
            )}
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 1,
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {stats.database.path}
            </Typography>
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
            <Box
              sx={{ mt: 1.5, display: "flex", justifyContent: "space-between" }}
            >
              <Typography variant="caption" color="text.secondary">
                {stats.database.totalRequests.toLocaleString()} requests
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.database.lastModified
                  ? new Date(stats.database.lastModified).toLocaleDateString()
                  : "N/A"}
              </Typography>
            </Box>
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsCard title="Process Memory" icon={<DnsIcon />}>
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  RSS
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {stats.process.rssHuman}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (stats.process.rss / 4096) * 100)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(0,0,0,0.06)",
                  mb: 1.5,
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Heap Used
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {stats.process.heapUsedHuman}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={
                  stats.process.heapTotal > 0
                    ? (stats.process.heapUsed / stats.process.heapTotal) * 100
                    : 0
                }
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(0,0,0,0.06)",
                  mb: 1.5,
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Heap Total
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {stats.process.heapTotalHuman}
                </Typography>
              </Box>
            </Box>
          </StatsCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsCard title="Uptime" icon={<PowerSettingsNewIcon />}>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                {uptime}
              </Typography>
            </Box>
            <Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  CPU Model
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
                  ROCm
                </Typography>
                <Chip
                  size="small"
                  label={stats.gpu.rocmAvailable ? "Available" : "Not Found"}
                  sx={{
                    bgcolor: stats.gpu.rocmAvailable
                      ? "success.light"
                      : "grey.300",
                    color: stats.gpu.rocmAvailable ? "white" : "text.secondary",
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

        {stats.cpu.cores.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <StatsCard title="Per-Core CPU Load" icon={<SpeedIcon />}>
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
            </StatsCard>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default ServerStats;
