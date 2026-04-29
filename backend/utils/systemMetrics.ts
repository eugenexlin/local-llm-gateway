import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import config from '../config';
import * as database from '../database';

const execFilePromise = promisify(execFile);

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
  gpuAvailable: boolean;
  gpus: GpuDetail[];
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

interface DatabaseInfo {
  path: string;
  size: number;
  sizeHuman: string;
  lastModified: string | null;
  totalRequests: number;
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
  network: NetworkInfo;
  platform: string;
  timestamp: string;
}

const CACHE_DURATION = 2000;
let cache: { stats: ServerStats; timestamp: number } | null = null;
let gpuLogStep = 0;

function gpuLog(step: number, message: string): void {
  if (gpuLogStep < step) {
    console.log(`[GPU] ${message}`);
    gpuLogStep = step;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function detectGpusFromSysfs(): Promise<Array<{ name: string; vendorId: string; vram?: number }>> {
  const gpus: Array<{ name: string; vendorId: string; vram?: number }> = [];
  const drmBase = '/sys/class/drm';

  try {
    const entries = fs.readdirSync(drmBase);
    const cards = entries.filter((f: string) => f.startsWith('card') && !f.includes('-'));

    for (const card of cards) {
      const devicePath = path.join(drmBase, card, 'device');
      const ueventPath = path.join(devicePath, 'uevent');

      if (!fs.existsSync(ueventPath)) continue;

      try {
        const uevent = fs.readFileSync(ueventPath, 'utf8');
        const vendorMatch = uevent.match(/PCI_VENDOR_ID=(.+)/);
        const drmNameMatch = uevent.match(/DRM_NAME=(.+)/);
        const pciNameMatch = uevent.match(/PCI_DEVICE_NAME=(.+)/);

        const vendorId = vendorMatch?.[1]?.trim() || '';
        const name = pciNameMatch?.[1]?.trim() || drmNameMatch?.[1]?.trim() || card;

        let vram: number | undefined;
        try {
          const memTotalPath = path.join(devicePath, 'mem_info_vram_total');
          if (fs.existsSync(memTotalPath)) {
            const memBytes = parseInt(fs.readFileSync(memTotalPath, 'utf8').trim(), 10);
            if (!isNaN(memBytes) && memBytes > 0) {
              vram = memBytes;
            }
          }
        } catch { /* skip */ }

        gpus.push({ name, vendorId, vram });
      } catch {
        // Skip unreadable cards
      }
    }
  } catch {
    // sysfs not accessible
  }

  return gpus;
}

async function getGpuInfo(): Promise<GpuInfo> {
  const gpus: GpuDetail[] = [];

  // Step 1: Try systeminformation
  let detectedGpus: Array<{ name: string; vendorId: string; vram?: number }> = [];

  try {
    const graphics = await si.graphics();
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
      gpuLog(1, `systeminformation detected ${graphics.controllers.length} GPU(s)`);
      detectedGpus = graphics.controllers.map((c: any) => ({
        name: c.model || 'Unknown GPU',
        vendorId: c.vendorId || '',
        vram: c.vram
      }));
    }
  } catch (err: any) {
    gpuLog(1, `systeminformation failed: ${err.message}`);
  }

  // Step 2: Fallback to pure sysfs detection
  if (detectedGpus.length === 0) {
    gpuLog(1, 'Falling back to sysfs detection');
    detectedGpus = await detectGpusFromSysfs();
    if (detectedGpus.length > 0) {
      gpuLog(1, `sysfs detected ${detectedGpus.length} GPU(s)`);
    }
  }

  // Step 3: Build GPU detail objects and enrich with sysfs
  for (const source of detectedGpus) {
    const gpu: GpuDetail = {
      name: source.name,
      temperatures: [],
      fanSpeed: null,
      power: null,
      memUsed: null,
      memTotal: source.vram ? Math.round(source.vram / (1024 * 1024 * 1024)) : null,
      utilization: null,
    };

    if (process.platform === 'linux') {
      enrichGpuWithSysfs(gpu);
    } else if (process.platform === 'win32') {
      await enrichGpuWindows({ model: source.name, vendorId: source.vendorId }, gpu);
    }

    gpus.push(gpu);
  }

  // Step 4: NVIDIA-specific enrichment via nvidia-smi
  if (process.platform === 'linux') {
    await enrichGpusWithNvidiaSmi(gpus, detectedGpus);
  }

  return { gpuAvailable: gpus.length > 0, gpus };
}

function enrichGpuWithSysfs(gpu: GpuDetail): void {
  const drmBase = '/sys/class/drm';

  try {
    const entries = fs.readdirSync(drmBase);
    const cards = entries.filter((f: string) => f.startsWith('card') && !f.includes('-'));

    for (const card of cards) {
      const devicePath = path.join(drmBase, card, 'device');
      const ueventPath = path.join(devicePath, 'uevent');

      if (!fs.existsSync(ueventPath)) continue;

      try {
        const uevent = fs.readFileSync(ueventPath, 'utf8');
        const drmNameMatch = uevent.match(/DRM_NAME=(.+)/);
        const pciNameMatch = uevent.match(/PCI_DEVICE_NAME=(.+)/);
        const sysfsName = pciNameMatch?.[1]?.trim() || drmNameMatch?.[1]?.trim();

        if (gpu.name === 'Unknown GPU' && sysfsName) {
          gpu.name = sysfsName;
        }

        try {
          const hwmonEntries = fs.readdirSync(path.join(devicePath, 'hwmon'));
          const hwmonDir = hwmonEntries.find((d: string) => d.startsWith('hwmon'));
          if (hwmonDir) {
            const hwmonPath = path.join(devicePath, 'hwmon', hwmonDir);

            // Read all temp*_input files
            const tempFiles = fs.readdirSync(hwmonPath).filter((f: string) => f.startsWith('temp') && f.endsWith('_input'));
            for (const tempFile of tempFiles) {
              const tempVal = fs.readFileSync(path.join(hwmonPath, tempFile), 'utf8').trim();
              const tempC = parseInt(tempVal, 10) / 1000;
              if (!isNaN(tempC) && tempC > 0) {
                gpu.temperatures.push(Math.round(tempC));
              }
            }

            // Read fan1_input (RPM)
            const fan1Path = path.join(hwmonPath, 'fan1_input');
            if (fs.existsSync(fan1Path)) {
              const fanVal = fs.readFileSync(fan1Path, 'utf8').trim();
              const fanRpm = parseInt(fanVal, 10);
              if (!isNaN(fanRpm) && fanRpm >= 0) {
                gpu.fanSpeed = fanRpm;
              }
            }
          }
        } catch { /* skip */ }

        try {
          const memTotalPath = path.join(devicePath, 'mem_info_vram_total');
          const memUsedPath = path.join(devicePath, 'mem_info_vram_used');
          if (fs.existsSync(memTotalPath) && fs.existsSync(memUsedPath)) {
            const memTotalBytes = parseInt(fs.readFileSync(memTotalPath, 'utf8').trim(), 10);
            const memUsedBytes = parseInt(fs.readFileSync(memUsedPath, 'utf8').trim(), 10);
            if (!isNaN(memTotalBytes) && !isNaN(memUsedBytes)) {
              gpu.memTotal = Math.round(memTotalBytes / (1024 * 1024 * 1024));
              gpu.memUsed = Math.round(memUsedBytes / (1024 * 1024 * 1024));
            }
          }
        } catch { /* skip */ }

        try {
          const utilPath = path.join(devicePath, 'gpu_busy_percent');
          if (fs.existsSync(utilPath)) {
            const utilVal = fs.readFileSync(utilPath, 'utf8').trim();
            const util = parseInt(utilVal, 10);
            if (!isNaN(util) && util >= 0 && util <= 100) {
              gpu.utilization = util;
            }
          }
        } catch { /* skip */ }

        try {
          const hwmonEntries = fs.readdirSync(path.join(devicePath, 'hwmon'));
          const hwmonDir = hwmonEntries.find((d: string) => d.startsWith('hwmon'));
          if (hwmonDir) {
            const hwmonPath = path.join(devicePath, 'hwmon', hwmonDir);
            const powerFiles = fs.readdirSync(hwmonPath).filter((f: string) => f.startsWith('power') && f.includes('average'));
            for (const powerFile of powerFiles) {
              const powerVal = fs.readFileSync(path.join(hwmonPath, powerFile), 'utf8').trim();
              const powerMicrowatts = parseInt(powerVal, 10);
              if (!isNaN(powerMicrowatts) && powerMicrowatts > 0) {
                gpu.power = Math.round(powerMicrowatts / 1000000);
                break;
              }
            }
          }
        } catch { /* skip */ }

        break;
      } catch {
        // Skip unreadable cards
      }
    }
  } catch (err: any) {
    gpuLog(8, `Linux sysfs read failed: ${err.message}`);
  }
}

async function enrichGpuWindows(_controller: any, gpu: GpuDetail): Promise<void> {
  try {
    const tempResult = await execPromise('powershell.exe', [
      '-NoProfile',
      '-Command',
      'try { $results = @(); $sensors = Get-CimInstance -Namespace "root/WMI" -ClassName "MSAcpi_ThermalZoneTemperature" -ErrorAction SilentlyContinue; if ($sensors) { foreach ($s in $sensors) { $mtf = $s.CurrentRelationshipUnits; if ($mtf -gt 0) { $tempC = [math]::Round(($s.CurrentTemperature / 10.0) - 273.15, 1) } else { $tempC = $s.CurrentTemperature }; $results += $tempC } } else { $results = @() }; $nvidiaSensors = Get-CimInstance -Namespace "root/NV_Indigo" -ClassName "NV_ThermalData" -ErrorAction SilentlyContinue; if ($nvidiaSensors) { foreach ($n in $nvidiaSensors) { if ($n.Temperature -and $n.Temperature -gt 0) { $nvidiaTemp = [math]::Round(($n.Temperature - 32) * 5.0 / 9.0, 1) }; $results += $nvidiaTemp } }; $amdGpus = Get-CimInstance -Namespace "root/WMI" -ClassName "AMDTemperature" -ErrorAction SilentlyContinue; if ($amdGpus) { foreach ($a in $amdGpus) { $results += $a.CurrentTemperature } }; if ($results.Count -gt 0) { $results | Select-Object -First 1 } else { Write-Output "N/A" } } catch { Write-Output "N/A" }',
    ]);
    const tempStr = tempResult.stdout.trim();
    if (tempStr !== 'N/A' && !tempStr.toLowerCase().includes('error')) {
      const tempVal = parseFloat(tempStr);
      if (!isNaN(tempVal) && tempVal > 0 && tempVal < 150) {
        gpu.temperatures[0] = Math.round(tempVal);
      }
    }
  } catch {
    gpuLog(9, 'Failed to read temperature via WMI');
  }

  try {
    const utilResult = await execPromise('powershell.exe', [
      '-NoProfile',
      '-Command',
      'try { $gpu = Get-CimInstance -Namespace "root\\CIMV2" -Class "Win32_VideoController" | Select-Object -First 1; if ($gpu) { $gpu.CurrentRefreshRate } else { Write-Output "N/A" } } catch { Write-Output "N/A" }',
    ]);
  } catch {
    gpuLog(10, 'Failed to read utilization via WMI');
  }

  try {
    const powerResult = await execPromise('powershell.exe', [
      '-NoProfile',
      '-Command',
      'try { $nvidiaPwr = Get-CimInstance -Namespace "root/NV_Indigo" -ClassName "NV_EnergyConsummeData" -ErrorAction SilentlyContinue; if ($nvidiaPwr -and $nvidiaPwr.CurrentPowerConsumption) { $nvidiaPwr.CurrentPowerConsumption } else { Write-Output "N/A" } } catch { Write-Output "N/A" }',
    ]);
    const powerStr = powerResult.stdout.trim();
    if (powerStr !== 'N/A' && !powerStr.toLowerCase().includes('error')) {
      const powerVal = parseFloat(powerStr);
      if (!isNaN(powerVal) && powerVal > 0) {
        gpu.power = Math.round(powerVal);
      }
    }
  } catch {
    gpuLog(11, 'Failed to read power via WMI');
  }
}

async function enrichGpusWithNvidiaSmi(gpus: GpuDetail[], detectedGpus: Array<{ name: string; vendorId: string }>): Promise<void> {
  const nvidiaIndices: number[] = [];
  for (let i = 0; i < detectedGpus.length; i++) {
    if (detectedGpus[i].vendorId === '0x10de' || detectedGpus[i].name.toLowerCase().includes('nvidia')) {
      nvidiaIndices.push(i);
    }
  }

  if (nvidiaIndices.length === 0) return;

  try {
    const { stdout } = await execFilePromise('nvidia-smi', [
      '--query-gpu=temperature.gpu,memory.total,memory.used,utilization.gpu,power.draw',
      '--format=csv,noheader,nounits'
    ], { timeout: 5000 });

    const lines = stdout.trim().split('\n').filter((l: string) => l.trim());

    for (let i = 0; i < nvidiaIndices.length && i < lines.length; i++) {
      const parts = lines[i].split(',').map((p: string) => p.trim());
      if (parts.length >= 5) {
        const gpu = gpus[nvidiaIndices[i]];
        const temp = parseFloat(parts[0]);
        const memTotalMb = parseFloat(parts[1]);
        const memUsedMb = parseFloat(parts[2]);
        const util = parseInt(parts[3], 10);
        const power = parseFloat(parts[4]);

        if (!isNaN(temp) && temp > 0) gpu.temperatures[0] = Math.round(temp);
        if (!isNaN(memTotalMb) && memTotalMb > 0) gpu.memTotal = Math.round(memTotalMb / 1024);
        if (!isNaN(memUsedMb) && memUsedMb > 0) gpu.memUsed = Math.round(memUsedMb / 1024);
        if (!isNaN(util) && util >= 0 && util <= 100) gpu.utilization = util;
        if (!isNaN(power) && power > 0) gpu.power = Math.round(power);

        if (gpu.name === 'Unknown GPU' || gpu.name === 'NVIDIA GPU') {
          gpu.name = 'NVIDIA GPU';
        }
      }
    }

    gpuLog(1, `nvidia-smi enriched ${nvidiaIndices.length} GPU(s)`);
  } catch (err: any) {
    gpuLog(1, `nvidia-smi failed: ${err.message}`);
  }
}

function execPromise(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = require('child_process').spawn(command, args, { shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('close', (code: number) => {
      if (code === 0 || code === null) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });
    child.on('error', (err: Error) => {
      reject(err);
    });
  });
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

  const [cpu, ram, gpu, databaseInfo, network] = await Promise.all([
    getCpuInfo(),
    getRamInfo(),
    getGpuInfo(),
    getDatabaseInfo(),
    getNetworkInfo(),
  ]);

  const stats: ServerStats = {
    cpu,
    ram,
    gpu,
    database: databaseInfo,
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
