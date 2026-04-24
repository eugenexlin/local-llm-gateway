import express, { Request, Response } from "express";
import { getServerStats, clearCache } from "../utils/systemMetrics";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const stats = await getServerStats();
    res.json(stats);
  } catch (error) {
    console.error("Error getting server stats:", error);
    res.status(500).json({ error: "Failed to get server stats" });
  }
});

router.post("/cache/clear", (_req: Request, res: Response) => {
  clearCache();
  res.json({ status: "ok" });
});

export default router;
