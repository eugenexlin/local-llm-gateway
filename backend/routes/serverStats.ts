import express, { Request, Response } from "express";
import { getServerStats, getStatsHistory, updateGpuRanges } from "../utils/systemMetrics";
import { requireAuth } from "../middleware/auth";
import { activeRequests } from "../utils/proxy-util";

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
