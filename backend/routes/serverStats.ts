import express, { Request, Response } from "express";
import { getServerStats, getStatsHistory, updateGpuRanges } from "../utils/systemMetrics";
import { requireAuth } from "../middleware/auth";
import { activeRequests } from "../utils/proxy-util";
import { getServerHealth, getModelInfo } from "../utils/serverHealth";
import { getServers } from "../config";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const stats = await getServerStats();
    updateGpuRanges(stats);
    res.json(stats);
  } catch (error) {
    console.error("Error getting server stats:", error);
    res.status(500).json({ error: "Failed to get server stats" });
  }
});

router.get("/history", (req: Request, res: Response) => {
  const history = getStatsHistory();
  const { since } = req.query;
  if (since) {
    const sinceTs = parseInt(since as string, 10);
    if (!isNaN(sinceTs)) {
      const filtered = history.filter((h) => new Date(h.timestamp).getTime() > sinceTs);
      return res.json(filtered);
    }
  }
  res.json(history);
});

router.get("/health", (req: Request, res: Response) => {
  res.json(getServerHealth());
});

router.get("/config", (req: Request, res: Response) => {
  const modelInfo = getModelInfo();
  const servers = getServers().map(s => ({
    name: s.name,
    statsUrl: s.statsUrl || null,
    models: s.models.map(m => ({
      name: m.name,
      url: m.url,
      ...(modelInfo[m.name] || {}),
    })),
  }));
  res.json(servers);
});

router.post("/abort-all", requireAuth, (req: Request, res: Response) => {
  const count = activeRequests.size;
  for (const [, { request }] of activeRequests) {
    try {
      request.destroy();
    } catch (err) {
      console.error("Error destroying request:", err);
    }
  }
  activeRequests.clear();
  console.log(`[EMERGENCY] Aborted ${count} active upstream requests`);
  res.json({ aborted: count });
});

export default router;