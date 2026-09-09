import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import config, { ServerConfig } from '../config';
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
  ranges?: {
    tempMin: number;
    tempMax: number;
    powerMin: number;
    powerMax: number;
    fanMin: number;
    fanMax: number;
  };
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
        const pciIdMatch = uevent.match(/PCI_ID=([0-9a-fA-F]+):/);
        const driverMatch = uevent.match(/DRIVER=(.+)/);
        const drmNameMatch = uevent.match(/DRM_NAME=(.+)/);
        const pciNameMatch = uevent.match(/PCI_DEVICE_NAME=(.+)/);

        const vendorId = vendorMatch?.[1]?.trim() || (pciIdMatch ? `0x${pciIdMatch[1]}` : '');
        const name = pciNameMatch?.[1]?.trim() || drmNameMatch?.[1]?.trim() || (driverMatch ? driverMatch[1].trim() : card);

        const driver = driverMatch?.[1]?.trim() || '';
        // Whitelist known GPU drivers — add new drivers here if needed
        if (driver && !['amdgpu', 'radeon'].includes(driver)) continue;

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
      detectedGpus = graphics.controllers.map((c: any) => ({
        name: c.model || 'Unknown GPU',
        vendorId: c.vendorId || '',
        vram: c.vram
      }));
    }
  } catch (err: any) {
  }

  // Step 2: Fallback to pure sysfs detection
  if (detectedGpus.length === 0) {
    detectedGpus = await detectGpusFromSysfs();
  }

  // Step 2b: Filter out virtual GPUs
  const isVirtual = (name: string) => /virtual|virtual\s*display|parsec|loopback|microsoft\s*basic/i.test(name);
  detectedGpus = detectedGpus.filter((g) => !isVirtual(g.name));

  // Step 3: Build GPU detail objects and enrich
  if (process.platform === 'win32') {
    const enrichPromises = detectedGpus.map(async (source, idx) => {
      const gpu: GpuDetail = {
        name: source.name,
        temperatures: [],
        fanSpeed: null,
        power: null,
        memUsed: null,
        memTotal: source.vram ? Math.round(source.vram / (1024 * 1024 * 1024)) : null,
        utilization: null,
      };
      await enrichGpuWindows({ model: source.name, vendorId: source.vendorId }, gpu);
      return { idx, gpu };
    });
    const results = await Promise.all(enrichPromises);
    for (const { idx, gpu } of results) {
      gpus[idx] = gpu;
    }
  } else {
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

      enrichGpuWithSysfs(gpu);

      gpus.push(gpu);
    }
  }

  // Step 4: AMD GPU enrichment via amd-smi / rocm-smi
  if (process.platform === 'linux') {
    await enrichGpusWithAmdSmi(gpus, detectedGpus);
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

            // Read all temp*_input files and their labels
            const tempFiles = fs.readdirSync(hwmonPath).filter((f: string) => f.startsWith('temp') && f.endsWith('_input'));
            const tempNumbers = tempFiles
              .map((f: string) => parseInt(f.replace('temp', '').replace('_input', ''), 10))
              .sort((a, b) => a - b);

            for (const tempNum of tempNumbers) {
              const tempInputPath = path.join(hwmonPath, `temp${tempNum}_input`);
              const tempLabelPath = path.join(hwmonPath, `temp${tempNum}_label`);
              const tempVal = fs.readFileSync(tempInputPath, 'utf8').trim();
              const tempC = parseInt(tempVal, 10) / 1000;
              if (!isNaN(tempC) && tempC > 0) {
                let label = `Temp ${tempNum}`;
                if (fs.existsSync(tempLabelPath)) {
                  const labelVal = fs.readFileSync(tempLabelPath, 'utf8').trim();
                  if (labelVal) label = labelVal;
                }
                gpu.temperatures.push({ value: Math.round(tempC), label });
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
  }
}

async function enrichGpuWindows(_controller: any, gpu: GpuDetail): Promise<void> {
  try {
    const result = await execPromise('powershell.exe', [
      '-NoProfile',
      '-Command',
      '$temp = "N/A"; $util = "N/A"; $power = "N/A"; try { $sensors = Get-CimInstance -Namespace "root/WMI" -ClassName "MSAcpi_ThermalZoneTemperature" -ErrorAction SilentlyContinue; if ($sensors) { foreach ($s in $sensors) { $mtf = $s.CurrentRelationshipUnits; if ($mtf -gt 0) { $temp = [math]::Round(($s.CurrentTemperature / 10.0) - 273.15, 1) } else { $temp = $s.CurrentTemperature }; break } }; if ($temp -eq "N/A") { $amdGpus = Get-CimInstance -Namespace "root/WMI" -ClassName "AMDTemperature" -ErrorAction SilentlyContinue; if ($amdGpus) { $temp = $amdGpus[0].CurrentTemperature } } } catch {}; try { $vc = Get-CimInstance -Namespace "root\\CIMV2" -Class "Win32_VideoController" -ErrorAction SilentlyContinue | Select-Object -First 1; if ($vc) { $util = $vc.CurrentRefreshRate } } catch {}; Write-Output "${temp}|${util}|${power}"',
    ]);
    const parts = result.stdout.trim().split('|');
    const tempVal = parseFloat(parts[0]);
    if (!isNaN(tempVal) && tempVal > 0 && tempVal < 150) {
      gpu.temperatures[0] = { value: Math.round(tempVal), label: 'GPU' };
    }
    const powerVal = parseFloat(parts[2]);
    if (!isNaN(powerVal) && powerVal > 0) {
      gpu.power = Math.round(powerVal);
    }
  } catch {
  }
}

async function detectAmdSmiTool(): Promise<'amd-smi' | 'rocm-smi' | null> {
  try {
    await execFilePromise('amd-smi', ['version'], { timeout: 5000 });
    return 'amd-smi';
  } catch { /* not available */ }

  try {
    await execFilePromise('rocm-smi', ['--showhw'], { timeout: 5000 });
    return 'rocm-smi';
  } catch { /* not available */ }

  return null;
}

async function enrichGpusWithAmdSmi(gpus: GpuDetail[], detectedGpus: Array<{ name: string; vendorId: string }>): Promise<void> {
  const amdIndices: number[] = [];
  for (let i = 0; i < detectedGpus.length; i++) {
    const v = detectedGpus[i].vendorId || '';
    const n = (detectedGpus[i].name || '').toLowerCase();
    if (v === '0x1002' || n.includes('amd') || n.includes('radeon') || n.includes('radon') || /mi\d+/.test(n)) {
      amdIndices.push(i);
    }
  }

  if (amdIndices.length === 0) return;

  const tool = await detectAmdSmiTool();
  if (!tool) return;

  if (tool === 'amd-smi') {
    await enrichGpusWithAmdSmiJson(gpus, amdIndices);
  } else {
    await enrichGpusWithRocmSmiText(gpus, amdIndices);
  }
}

async function enrichGpusWithAmdSmiJson(gpus: GpuDetail[], amdIndices: number[]): Promise<void> {
  try {
    const { stdout } = await execFilePromise('amd-smi', ['metric', '--json'], { timeout: 10000 });
    const data = JSON.parse(stdout);
    const gpuData = data.gpu_data || [];

    for (let i = 0; i < amdIndices.length && i < gpuData.length; i++) {
      const gd = gpuData[i];
      const gpu = gpus[amdIndices[i]];

      // Temperature: edge, hotspot, mem (nested { value, unit })
      const temps = gd.temperature || {};
      const edge = temps.edge;
      if (edge && typeof edge === 'object' && 'value' in edge) {
        const v = edge.value;
        if (typeof v === 'number' && v > 0) gpu.temperatures[0] = { value: Math.round(v), label: 'Edge' };
      }
      const hotspot = temps.hotspot;
      if (hotspot && typeof hotspot === 'object' && 'value' in hotspot) {
        const v = hotspot.value;
        if (typeof v === 'number' && v > 0) gpu.temperatures.push({ value: Math.round(v), label: 'Hotspot' });
      }
      const memTemp = temps.mem;
      if (memTemp && typeof memTemp === 'object' && 'value' in memTemp) {
        const v = memTemp.value;
        if (typeof v === 'number' && v > 0) gpu.temperatures.push({ value: Math.round(v), label: 'Memory' });
      }

      // Memory: used_vram, total_vram (in MB, nested { value, unit })
      const mem = gd.mem_usage || {};
      const usedVram = mem.used_vram;
      if (usedVram && typeof usedVram === 'object' && 'value' in usedVram) {
        const mb = usedVram.value;
        if (typeof mb === 'number' && mb > 0) gpu.memUsed = Math.round(mb / 1024);
      }
      const totalVram = mem.total_vram;
      if (totalVram && typeof totalVram === 'object' && 'value' in totalVram) {
        const mb = totalVram.value;
        if (typeof mb === 'number' && mb > 0) gpu.memTotal = Math.round(mb / 1024);
      }

      // Utilization: gfx_activity (percentage, nested { value, unit })
      const usage = gd.usage || {};
      const gfx = usage.gfx_activity;
      if (gfx && typeof gfx === 'object' && 'value' in gfx) {
        const v = gfx.value;
        if (typeof v === 'number' && v >= 0 && v <= 100) gpu.utilization = Math.round(v);
      }

      // Power: socket_power (in W, nested { value, unit })
      const power = gd.power || {};
      const socketPwr = power.socket_power;
      if (socketPwr && typeof socketPwr === 'object' && 'value' in socketPwr) {
        const v = socketPwr.value;
        if (typeof v === 'number' && v > 0) gpu.power = Math.round(v);
      }

      // Fan speed: rpm is direct number, speed is 0-255
      const fan = gd.fan || {};
      if (typeof fan.rpm === 'number' && fan.rpm > 0) {
        gpu.fanSpeed = fan.rpm;
      } else if (typeof fan.speed === 'number' && fan.speed > 0) {
        gpu.fanSpeed = fan.speed;
      }

      // GPU name from amd-smi
      const gpuName = gd.gpu_name || gd.NAME;
      if (gpuName && gpuName !== 'N/A' && gpuName !== 'Unknown GPU') {
        gpu.name = gpuName;
      }
    }
  } catch { /* amd-smi failed, fall through to nothing */ }
}

async function enrichGpusWithRocmSmiText(gpus: GpuDetail[], amdIndices: number[]): Promise<void> {
  const metrics: Array<{ key: string; gpuIdx: number; value: string }> = [];

  const commands: Array<{ args: string[]; parse: (line: string) => { key: string; gpuIdx: number; value: string } | null }> = [
    {
      args: ['--showtemp'],
      parse: (line: string) => {
        const m = line.match(/GPU\[(\d+)\]\s*:\s*Temp\s*\(\w+(?:\s+\w+)*\)\s*:\s*([\d.]+)/);
        if (m) return { key: 'temp', gpuIdx: parseInt(m[1], 10), value: m[2] };
        return null;
      },
    },
    {
      args: ['--showmemused'],
      parse: (line: string) => {
        const m = line.match(/GPU\[(\d+)\]\s*:\s*VRAM\s+Used\s*\(MiB\)\s*:\s*([\d.]+)/);
        if (m) return { key: 'memUsedMiB', gpuIdx: parseInt(m[1], 10), value: m[2] };
        const m2 = line.match(/GPU\[(\d+)\]\s*:\s*VRAM\s+Total\s*\(MiB\)\s*:\s*([\d.]+)/);
        if (m2) return { key: 'memTotalMiB', gpuIdx: parseInt(m2[1], 10), value: m2[2] };
        return null;
      },
    },
    {
      args: ['--showpower'],
      parse: (line: string) => {
        const m = line.match(/GPU\[(\d+)\]\s*:\s*Power\s*\(Avg\)\s*:\s*([\d.]+)/);
        if (m) return { key: 'power', gpuIdx: parseInt(m[1], 10), value: m[2] };
        return null;
      },
    },
    {
      args: ['--showusage'],
      parse: (line: string) => {
        const m = line.match(/GPU\[(\d+)\]\s*:\s*GFX\s+Activity\s*\(%\)\s*:\s*([\d.]+)/);
        if (m) return { key: 'utilization', gpuIdx: parseInt(m[1], 10), value: m[2] };
        return null;
      },
    },
    {
      args: ['--showfan'],
      parse: (line: string) => {
        const m = line.match(/GPU\[(\d+)\]\s*:\s*Fan\s+RPM\s*:\s*([\d.]+)/);
        if (m) return { key: 'fanSpeed', gpuIdx: parseInt(m[1], 10), value: m[2] };
        return null;
      },
    },
  ];

  for (const cmd of commands) {
    try {
      const { stdout } = await execFilePromise('rocm-smi', cmd.args, { timeout: 5000 });
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parsed = cmd.parse(line);
        if (parsed) metrics.push(parsed);
      }
    } catch { /* skip this metric */ }
  }

  // Apply collected metrics to GPU objects
  for (const m of metrics) {
    const gpu = gpus[amdIndices[m.gpuIdx]];
    if (!gpu) continue;

    switch (m.key) {
      case 'temp': {
        const v = parseFloat(m.value);
        if (!isNaN(v) && v > 0) gpu.temperatures[0] = { value: Math.round(v), label: 'GPU' };
        break;
      }
      case 'memUsedMiB': {
        const mb = parseFloat(m.value);
        if (!isNaN(mb) && mb > 0) gpu.memUsed = Math.round(mb / 1024);
        break;
      }
      case 'memTotalMiB': {
        const mb = parseFloat(m.value);
        if (!isNaN(mb) && mb > 0) gpu.memTotal = Math.round(mb / 1024);
        break;
      }
      case 'power': {
        const v = parseFloat(m.value);
        if (!isNaN(v) && v > 0) gpu.power = Math.round(v);
        break;
      }
      case 'utilization': {
        const v = parseInt(m.value, 10);
        if (!isNaN(v) && v >= 0 && v <= 100) gpu.utilization = v;
        break;
      }
      case 'fanSpeed': {
        const v = parseInt(m.value, 10);
        if (!isNaN(v) && v >= 0) gpu.fanSpeed = v;
        break;
      }
    }
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
  const cpuP = getCpuInfo();
  const gpuP = getGpuInfo();
  const netP = getNetworkInfo();
  const ram = getRamInfo();
  const databaseInfo = getDatabaseInfo();

  const [cpu, gpu, network] = await Promise.all([cpuP, gpuP, netP]);

  const stats: ServerStats = {
    cpu,
    ram,
    gpu,
    database: databaseInfo,
    network,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  };

  return stats;
}

const HISTORY_MAX_POINTS = 256;
const HISTORY_INTERVAL = 2000;
let statsHistory: ServerStats[] = [];
interface GpuRangeState {
  tempMin: number | null;
  tempMax: number | null;
  powerMin: number | null;
  powerMax: number | null;
  fanMin: number | null;
  fanMax: number | null;
}

// Single global range shared across all GPUs, so the same metric can be
// compared across GPUs. Grows (never shrinks) over the backend's lifetime.
let gpuRangeState: GpuRangeState = {
  tempMin: null,
  tempMax: null,
  powerMin: null,
  powerMax: null,
  fanMin: null,
  fanMax: null,
};

function expandRange(
  min: number | null,
  max: number | null,
  value: number,
): [number, number] {
  if (min === null || max === null) return [value, value];
  return [Math.min(min, value), Math.max(max, value)];
}

function toSpan(min: number | null, max: number | null): [number, number] {
  if (min === null || max === null) return [0, 1];
  if (max === min) return [min, min + 1];
  return [min, max];
}

export function updateGpuRanges(stats: ServerStats): void {
  const s = gpuRangeState;

  for (const gpu of stats.gpu.gpus) {
    for (const temp of gpu.temperatures) {
      [s.tempMin, s.tempMax] = expandRange(s.tempMin, s.tempMax, temp.value);
    }

    if (gpu.power !== null && gpu.power !== undefined) {
      [s.powerMin, s.powerMax] = expandRange(s.powerMin, s.powerMax, gpu.power);
    }

    if (gpu.fanSpeed !== null && gpu.fanSpeed !== undefined) {
      [s.fanMin, s.fanMax] = expandRange(s.fanMin, s.fanMax, gpu.fanSpeed);
    }
  }

  const [tempMin, tempMax] = toSpan(s.tempMin, s.tempMax);
  const [powerMin, powerMax] = toSpan(s.powerMin, s.powerMax);
  const [fanMin, fanMax] = toSpan(s.fanMin, s.fanMax);

  stats.gpu.ranges = { tempMin, tempMax, powerMin, powerMax, fanMin, fanMax };
}

export function getStatsHistory(): ServerStats[] {
  return statsHistory;
}

export function startStatsHistoryCollector(): void {
  let nextTargetTime = Date.now() + HISTORY_INTERVAL;

  async function collectAndSchedule(): Promise<void> {
    try {
      const stats = await getServerStats();
      updateGpuRanges(stats);

      statsHistory.push(stats);
      if (statsHistory.length > HISTORY_MAX_POINTS) {
        statsHistory = statsHistory.slice(-HISTORY_MAX_POINTS);
      }
    } catch (err) {
      // Silently skip failed collection cycles
    }

    nextTargetTime += HISTORY_INTERVAL;
    const delay = Math.max(0, nextTargetTime - Date.now());

    if (delay === 0) {
      // Already behind — skip this cycle, schedule next
      setTimeout(collectAndSchedule, HISTORY_INTERVAL);
    } else {
      setTimeout(collectAndSchedule, delay);
    }
  }

  setTimeout(collectAndSchedule, HISTORY_INTERVAL);
}

const remoteStatsHistory: Record<string, ServerStats[]> = {};
const zeroFilled = Symbol("zeroFilled");

interface RemoteServerState {
  consecutiveFailures: number;
  offline: boolean;
  gapStartTimestamp: string | null;
}
const remoteServerState: Record<string, RemoteServerState> = {};

const OFFLINE_THRESHOLD = 3;

function createZeroStats(): ServerStats & { [zeroFilled]?: true } {
  const stats: ServerStats & { [zeroFilled]: true } = {
    [zeroFilled]: true,
    cpu: {
      usage: 0,
      loadAvg: [0, 0, 0],
      cores: [],
      model: 'Offline',
      speed: 0,
    },
    ram: {
      used: 0,
      total: 0,
      usedPercent: 0,
      swapUsed: 0,
      swapTotal: 0,
    },
    gpu: {
      gpuAvailable: false,
      gpus: [],
    },
    database: {
      path: '',
      size: 0,
      sizeHuman: '0 B',
      lastModified: null,
      totalRequests: 0,
    },
    network: {
      bytesSent: 0,
      bytesReceived: 0,
      bytesSentHuman: '0 B',
      bytesReceivedHuman: '0 B',
    },
    platform: 'offline',
    timestamp: new Date().toISOString(),
  };
  return stats;
}

export function getRemoteStatsHistory(serverName: string): ServerStats[] {
  return remoteStatsHistory[serverName] || [];
}

export function getRemoteServerStatus(): Record<string, { offline: boolean }> {
  const result: Record<string, { offline: boolean }> = {};
  for (const [name, state] of Object.entries(remoteServerState)) {
    result[name] = { offline: state.offline };
  }
  return result;
}

export function startRemoteStatsPolling(): void {
  const servers = config.servers.filter((s: ServerConfig) => s.baseUrl);
  for (const server of servers) {
    const key = server.name;
    remoteStatsHistory[key] = [];
    remoteServerState[key] = {
      consecutiveFailures: 0,
      offline: false,
      gapStartTimestamp: null,
    };
    pollRemoteServer(server.name, server.baseUrl!);
  }
}

async function mergeRemoteHistory(name: string, baseUrl: string): Promise<void> {
  const state = remoteServerState[name];
  if (!state || !state.gapStartTimestamp) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${baseUrl}/api/server-stats/history?since=${new Date(state.gapStartTimestamp).getTime()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const remoteHistory = await response.json() as ServerStats[];
      if (remoteHistory.length > 0) {
        const cached = remoteStatsHistory[name];
        const gapStartMs = new Date(state.gapStartTimestamp).getTime();
        const gapEndMs = Date.now();

        for (let i = 0; i < cached.length; i++) {
          const pointTs = new Date(cached[i].timestamp).getTime();
          if (pointTs >= gapStartMs && pointTs <= gapEndMs && (cached[i] as any)[zeroFilled]) {
            const closest = remoteHistory.reduce((best, remote) => {
              const remoteTs = new Date(remote.timestamp).getTime();
              const bestDiff = Math.abs(new Date(best.timestamp).getTime() - pointTs);
              const remoteDiff = Math.abs(remoteTs - pointTs);
              return remoteDiff < bestDiff ? remote : best;
            });
            cached[i] = closest;
          }
        }
      }
    }
  } catch {
    // Merge failed, keep zero-filled data
  }
}

async function pollRemoteServer(name: string, baseUrl: string): Promise<void> {
  const fetchAndSchedule = async () => {
    const state = remoteServerState[name];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${baseUrl}/api/server-stats`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const stats = await response.json() as ServerStats;
        remoteStatsHistory[name].push(stats);
        if (remoteStatsHistory[name].length > HISTORY_MAX_POINTS) {
          remoteStatsHistory[name] = remoteStatsHistory[name].slice(-HISTORY_MAX_POINTS);
        }

        if (state && state.offline) {
          await mergeRemoteHistory(name, baseUrl);
          state.offline = false;
          state.consecutiveFailures = 0;
          state.gapStartTimestamp = null;
        } else if (state) {
          state.consecutiveFailures = 0;
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      if (state) {
        state.consecutiveFailures++;
        if (!state.gapStartTimestamp) {
          state.gapStartTimestamp = new Date().toISOString();
        }
        if (state.consecutiveFailures >= OFFLINE_THRESHOLD) {
          state.offline = true;
        }
      }
      const zeroStats = createZeroStats();
      remoteStatsHistory[name].push(zeroStats);
      if (remoteStatsHistory[name].length > HISTORY_MAX_POINTS) {
        remoteStatsHistory[name] = remoteStatsHistory[name].slice(-HISTORY_MAX_POINTS);
      }
    }
    setTimeout(fetchAndSchedule, HISTORY_INTERVAL);
  };
  setTimeout(fetchAndSchedule, HISTORY_INTERVAL);
}
