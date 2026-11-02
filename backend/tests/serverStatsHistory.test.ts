describe('Server Stats History & Timetravel Scenarios', () => {
  const HISTORY_MAX_POINTS = 256;
  const HISTORY_INTERVAL_MS = 2000;

  function createMockStat(timestampMs: number, cpuUsage = 20, mainTemp: number | null = 55) {
    return {
      cpu: {
        usage: cpuUsage,
        loadAvg: [1.0, 1.0, 1.0],
        cores: [{ cpu: cpuUsage, brand: 'Mock CPU', speed: 3000, load: cpuUsage }],
        model: 'Mock CPU',
        speed: 3000,
        temperature: {
          main: mainTemp,
          cores: mainTemp !== null ? [mainTemp - 2, mainTemp + 1] : [],
          max: mainTemp !== null ? mainTemp + 1 : null,
        },
      },
      ram: { used: 8, total: 32, usedPercent: 25, swapUsed: 0, swapTotal: 0 },
      gpu: { gpuAvailable: false, gpus: [] },
      database: { path: '', size: 0, sizeHuman: '0 B', lastModified: null, totalRequests: 0 },
      network: { bytesSent: 0, bytesReceived: 0, bytesSentHuman: '0 B', bytesReceivedHuman: '0 B' },
      platform: 'linux',
      timestamp: new Date(timestampMs).toISOString(),
    };
  }

  class MockServerHistoryBuffer {
    private history: ReturnType<typeof createMockStat>[] = [];

    addPoint(stat: ReturnType<typeof createMockStat>) {
      this.history.push(stat);
      if (this.history.length > HISTORY_MAX_POINTS) {
        this.history = this.history.slice(-HISTORY_MAX_POINTS);
      }
    }

    getHistory(sinceMs?: number) {
      if (sinceMs !== undefined) {
        return this.history.filter((h) => new Date(h.timestamp).getTime() > sinceMs);
      }
      return [...this.history];
    }

    get length() {
      return this.history.length;
    }
  }

  describe('Scenario A: Normal Foreground Streaming', () => {
    it('should maintain sequential points spaced by interval', () => {
      const server = new MockServerHistoryBuffer();
      const baseTime = 1700000000000;

      for (let i = 0; i < 50; i++) {
        server.addPoint(createMockStat(baseTime + i * HISTORY_INTERVAL_MS));
      }

      const history = server.getHistory();
      expect(history.length).toBe(50);
      for (let i = 1; i < history.length; i++) {
        const diff = new Date(history[i].timestamp).getTime() - new Date(history[i - 1].timestamp).getTime();
        expect(diff).toBe(HISTORY_INTERVAL_MS);
      }
    });
  });

  describe('Scenario B: Timetravel 5 Minutes (Tab Sleep & Wakeup)', () => {
    it('should backfill exact missing points when client resumes within retention', () => {
      const server = new MockServerHistoryBuffer();
      const baseTime = 1700000000000;

      // Initial 100 points
      for (let i = 0; i < 100; i++) {
        server.addPoint(createMockStat(baseTime + i * HISTORY_INTERVAL_MS));
      }

      const clientLastSync = new Date(server.getHistory()[99].timestamp).getTime();

      // Timetravel 5 minutes forward (300 seconds = 150 points) while client is sleeping
      for (let i = 100; i < 250; i++) {
        server.addPoint(createMockStat(baseTime + i * HISTORY_INTERVAL_MS));
      }

      // Client wakes up and queries since lastSync
      const backfilledPoints = server.getHistory(clientLastSync);

      expect(backfilledPoints.length).toBe(150);
      expect(new Date(backfilledPoints[0].timestamp).getTime()).toBe(clientLastSync + HISTORY_INTERVAL_MS);
      expect(new Date(backfilledPoints[backfilledPoints.length - 1].timestamp).getTime()).toBe(baseTime + 249 * HISTORY_INTERVAL_MS);
    });
  });

  describe('Scenario C: Timetravel 15 Minutes (Exceeding Server Retention)', () => {
    it('should cap server buffer at 256 points and shift oldest points out', () => {
      const server = new MockServerHistoryBuffer();
      const baseTime = 1700000000000;

      // 450 points generated over 15 minutes
      for (let i = 0; i < 450; i++) {
        server.addPoint(createMockStat(baseTime + i * HISTORY_INTERVAL_MS));
      }

      expect(server.length).toBe(HISTORY_MAX_POINTS);
      const history = server.getHistory();
      // Oldest retained point should be point index 450 - 256 = 194
      expect(new Date(history[0].timestamp).getTime()).toBe(baseTime + 194 * HISTORY_INTERVAL_MS);
      expect(new Date(history[history.length - 1].timestamp).getTime()).toBe(baseTime + 449 * HISTORY_INTERVAL_MS);
    });

    it('client detecting gap > retention should re-seed with full server history', () => {
      const RETENTION_MS = HISTORY_MAX_POINTS * HISTORY_INTERVAL_MS; // 512,000 ms
      const clientLastSync = 1700000000000;
      const clientWakeupTime = clientLastSync + 15 * 60 * 1000; // 15 mins later

      const gapMs = clientWakeupTime - clientLastSync;
      expect(gapMs).toBeGreaterThan(RETENTION_MS);

      // Strategy: if gapMs > RETENTION_MS, client requests full history (sinceMs = undefined)
      const action = gapMs > RETENTION_MS ? 'reset_full' : 'incremental_backfill';
      expect(action).toBe('reset_full');
    });
  });

  describe('Scenario D: CPU Temperature in History', () => {
    it('should retain CPU temperature in each history entry', () => {
      const server = new MockServerHistoryBuffer();
      const baseTime = 1700000000000;

      server.addPoint(createMockStat(baseTime, 30, 48.5));
      server.addPoint(createMockStat(baseTime + 2000, 85, 67.2));

      const history = server.getHistory();
      expect(history[0].cpu.temperature?.main).toBe(48.5);
      expect(history[1].cpu.temperature?.main).toBe(67.2);
      expect(history[1].cpu.temperature?.cores).toEqual([65.2, 68.2]);
    });
  });
});
