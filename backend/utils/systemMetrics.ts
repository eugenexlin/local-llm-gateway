import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import config from '../config';
import * as database from '../database';

const execFileAsync = promisify(execFile);

interface CpuCore {
  cpu: number;
  brand: string;
  speed: number;
  load: number;
}

interface CpuInfo {
  usage: number;
  loadAvg: number[];
  cores: CpuCore[];
  model: string;
  speed: number;
}

interface RamInfo {
  used: number;
  total: number;
  usedPercent: number;
  swapUsed: number;
  swapTotal: number;
}

interface GpuInfo {
  rocmAvailable: boolean;
  gpus: GpuDetail[];
}

interface GpuDetail {
  name: string;
  temperature: number | null;
  power: number | null;
  memUsed: number | null;
  memTotal: number | null;
  utilization: number | null;
}

interface DatabaseInfo {
  path: string;
  size: number;
  sizeHuman: string;
  lastModified: string | null;
  totalRequests: number;
}

interface ProcessInfo {
  rss: number;
  rssHuman: string;
  heapUsed: number;
  heapUsedHuman: string;
  heapTotal: number;
  heapTotalHuman: string;
  uptime: number;
  uptimeHuman: string;
}

interface NetworkInfo {
  bytesSent: number;
  bytesReceived: number;
  bytesSentHuman: string;
  bytesReceivedHuman: string;
}

interface ServerStats {
  cpu: CpuInfo;
  ram: RamInfo;
  gpu: GpuInfo;
  database: DatabaseInfo;
  process: ProcessInfo;
  network: NetworkInfo;
  platform: string;
  timestamp: string;
}

const CACHE_DURATION = 2000;
let cache: { stats: ServerStats; timestamp: number } | null = null;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function getGpuInfo(): Promise<GpuInfo> {
  if (process.platform !== 'linux') {
    return { rocmAvailable: false, gpus: [] };
  }

  try {
    await execFileAsync('which', ['rocm-smi']);
  } catch {
    return { rocmAvailable: false, gpus: [] };
  }

  try {
    const { stdout } = await execFileAsync('rocm-smi', ['--json', '--showinfo'], {
      timeout: 3000,
    });

    const json = JSON.parse(stdout);
    const gpus: GpuDetail[] = [];

    if (json['GPU iBMC Sensor Info']?.temp_edges?.length) {
      const sensorData = json['GPU iBMC Sensor Info'];
      const tempData = json['GPU Temperature'] || {};
      const powerData = json['GPU Power'] || {};
      const memData = json['GPU Memory Usage'] || {};
      const computeData = json['GPU Utilization'] || {};

      const gpuCount = sensorData.temp_edges.length;

      for (let i = 0; i < gpuCount; i++) {
        const nameMatch = json['GPU ident']?.[`GPU${i}`]?.['GPU Name'] || 
                          json['GPU Name']?.[i] || 
                          `GPU ${i}`;

        const tempEdge = sensorData.temp_edges[i];
        const tempValue = typeof tempEdge === 'object' ? tempEdge['GPU${i}'] : tempEdge;
        const tempC = tempData['GPU${i} Temperature'] || 
                       (tempData['GPU${i} Temperature (VDDCI)'] as any)?.['VDDCI'] || 
                       tempValue;

        const powerValue = powerData[`GPU${i} Average Power`] || 
                          powerData[`GPU${i} Power Instance Average`] || 
                          null;

        const memUsedValue = memData[`GPU${i} GPU Memory Used`] || 
                            (memData['GPU Mem Memory Used'] as any)?.['GPU Mem'] || 
                            null;

        const memTotalValue = memData[`GPU${i} Total GPU Memory`] || 
                             (memData['GPU Mem Memory Used'] as any)?.['Total'] || 
                             null;

        const utilValue = computeData[`GPU${i} GPU Activity`] || 
                         computeData[`GPU${i} Average Activity`] || 
                         null;

        gpus.push({
          name: nameMatch || `GPU ${i}`,
          temperature: tempC ? parseFloat(tempC) : null,
          power: powerValue ? parseFloat(powerValue) : null,
          memUsed: memUsedValue ? Math.round(parseFloat(memUsedValue) / (1024 * 1024)) : null,
          memTotal: memTotalValue ? Math.round(parseFloat(memTotalValue) / (1024 * 1024)) : null,
          utilization: utilValue ? parseFloat(utilValue) : null,
        });
      }
    } else if (json.data) {
      const data = Array.isArray(json.data) ? json.data : Object.values(json.data);

      for (const gpu of data) {
        const temp = gpu['GPU Temp'] || gpu.temperature || null;
        const power = gpu['GPU Power Draw'] || gpu.power || null;
        const memUsed = gpu['GPU Memory Used'] || gpu.memory?.used || null;
        const memTotal = gpu['GPU Memory Total'] || gpu.memory?.total || null;
        const util = gpu['GPU Activity'] || gpu.utilization || null;
        const name = gpu['GPU Name'] || gpu.name || gpu.device || `GPU`;

        gpus.push({
          name: String(name).trim() || `GPU`,
          temperature: temp ? parseFloat(temp) : null,
          power: power ? parseFloat(power) : null,
          memUsed: memUsed ? Math.round(parseFloat(memUsed) / (1024 * 1024)) : null,
          memTotal: memTotal ? Math.round(parseFloat(memTotal) / (1024 * 1024)) : null,
          utilization: util ? parseFloat(util) : null,
        });
      }
    }

    if (gpus.length > 0) {
      return { rocmAvailable: true, gpus };
    }
  } catch {
    return { rocmAvailable: false, gpus: [] };
  }

  try {
    const fallbackGpus: GpuDetail[] = [];
    const { stdout } = await execFileAsync('rocm-smi', ['--json'], {
      timeout: 3000,
    });

    const json = JSON.parse(stdout);
    const data = json.data || {};
    const entries = Array.isArray(data) ? data : Object.values(data);

    for (const gpu of entries) {
      const name = gpu['GPU Name'] || gpu.name || gpu.device || `GPU`;
      fallbackGpus.push({
        name: String(name).trim() || `GPU`,
        temperature: gpu['GPU Temp'] ? parseFloat(gpu['GPU Temp']) : null,
        power: gpu['GPU Power Draw'] ? parseFloat(gpu['GPU Power Draw']) : null,
        memUsed: gpu['GPU Memory Used'] ? Math.round(parseFloat(gpu['GPU Memory Used']) / (1024 * 1024)) : null,
        memTotal: gpu['GPU Memory Total'] ? Math.round(parseFloat(gpu['GPU Memory Total']) / (1024 * 1024)) : null,
        utilization: gpu['GPU Activity'] ? parseFloat(gpu['GPU Activity']) : null,
      });
    }

    if (fallbackGpus.length > 0) {
      return { rocmAvailable: true, gpus: fallbackGpus };
    }
  } catch {
    return { rocmAvailable: false, gpus: [] };
  }

  return { rocmAvailable: false, gpus: [] };
}

async function getCpuInfo(): Promise<CpuInfo> {
  const cpuLoad = os.cpus();
  const loadAvg = os.loadavg();

  const cores: CpuCore[] = cpuLoad.map((cpu) => ({
    cpu: 0,
    brand: cpu.model,
    speed: cpu.speed,
    load: 0,
  }));

  try {
    const currentLoad = await si.currentLoad();
    if (currentLoad && currentLoad.cpus) {
      const totalLoad = currentLoad.cpus.reduce((sum: number, load: any) => sum + (load.load || 0), 0);
      const avgLoad = totalLoad / currentLoad.cpus.length;

      for (let i = 0; i < cores.length; i++) {
        cores[i].load = currentLoad.cpus[i]?.load || 0;
      }
      cores[0].cpu = avgLoad;
    }
  } catch {
    cores[0].cpu = loadAvg[0] / os.cpus().length * 100;
  }

  return {
    usage: cores[0].cpu,
    loadAvg,
    cores,
    model: cpuLoad[0]?.model || 'Unknown',
    speed: cpuLoad[0]?.speed || 0,
  };
}

function getRamInfo(): RamInfo {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usedPercent = (used / total) * 100;

  const swapTotal = os.totalmem() - os.freemem() + (total - used);
  const swapUsed = Math.max(0, swapTotal > 0 ? (usedPercent / 100) * swapTotal * 0.1 : 0);

  return {
    used: Math.round(used / (1024 * 1024 * 1024) * 10) / 10,
    total: Math.round(total / (1024 * 1024 * 1024)),
    usedPercent: Math.round(usedPercent * 10) / 10,
    swapUsed: Math.round(swapUsed / (1024 * 1024 * 1024) * 10) / 10,
    swapTotal: Math.round(swapTotal / (1024 * 1024 * 1024)),
  };
}

function getDatabaseInfo(): DatabaseInfo {
  const dbPath = path.join(__dirname, '../../', config.databasePath);

  try {
    const stats = fs.statSync(dbPath);
    const usageSummary = database.getUsageSummary();

    return {
      path: config.databasePath,
      size: stats.size,
      sizeHuman: formatBytes(stats.size),
      lastModified: stats.mtime.toISOString(),
      totalRequests: usageSummary.total_requests,
    };
  } catch {
    return {
      path: config.databasePath,
      size: 0,
      sizeHuman: '0 B',
      lastModified: null,
      totalRequests: 0,
    };
  }
}

function getProcessInfo(): ProcessInfo {
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  return {
    rss: Math.round(mem.rss / (1024 * 1024)),
    rssHuman: formatBytes(mem.rss),
    heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
    heapUsedHuman: formatBytes(mem.heapUsed),
    heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
    heapTotalHuman: formatBytes(mem.heapTotal),
    uptime: Math.round(uptime),
    uptimeHuman: formatUptime(uptime),
  };
}

async function getNetworkInfo(): Promise<NetworkInfo> {
  let bytesSent = 0;
  let bytesReceived = 0;

  try {
    const netStats = await si.networkStats();
    for (const stat of netStats) {
      bytesSent += stat.tx_bytes || 0;
      bytesReceived += stat.rx_bytes || 0;
    }
  } catch {
    const interfaces = os.networkInterfaces();
    for (const [_name, ifaceList] of Object.entries(interfaces)) {
      for (const iface of ifaceList || []) {
        if (!iface.internal) {
          bytesSent += 0;
          bytesReceived += 0;
        }
      }
    }
  }

  return {
    bytesSent,
    bytesReceived,
    bytesSentHuman: formatBytes(bytesSent),
    bytesReceivedHuman: formatBytes(bytesReceived),
  };
}

export async function getServerStats(): Promise<ServerStats> {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.stats;
  }

  const [cpu, ram, gpu, databaseInfo, processInfo, network] = await Promise.all([
    getCpuInfo(),
    getRamInfo(),
    getGpuInfo(),
    getDatabaseInfo(),
    getProcessInfo(),
    getNetworkInfo(),
  ]);

  const stats: ServerStats = {
    cpu,
    ram,
    gpu,
    database: databaseInfo,
    process: processInfo,
    network,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  };

  cache = { stats, timestamp: Date.now() };
  return stats;
}

export function clearCache() {
  cache = null;
}
