import express, { Request, Response } from "express";
import * as database from "../database";
import { generateApiKey, hashApiKey } from "../utils/hash";

const router = express.Router();

interface CreateApiKeyBody {
  name: string;
  description?: string;
}

interface SessionRequest extends Request {
  session: any;
  user?: any;
}

// Create API key
router.post("/", (req: any, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const id = crypto.randomUUID();
    const rawApiKey = generateApiKey();
    const hashedKey = hashApiKey(rawApiKey);

    database.createApiKey({
      id,
      name,
      key_hash: hashedKey,
      description: description || null,
      user_id: userId,
    });

    res.status(201).json({
      id,
      name,
      description: description || null,
      api_key: rawApiKey,
      created_at: new Date().toISOString(),
      user_id: userId,
      is_active: 1,
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// List API keys
router.get("/", (req: SessionRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const apiKeys = database.getApiKeysByUserId(userId as string, true);
    
    const keysWithMetrics = apiKeys.map((key: any) => {
      const hasMetrics = database.checkApiKeyHasMetrics(key.id);
      return {
        ...key,
        has_metrics: hasMetrics,
      };
    });
    
    res.json(
      keysWithMetrics.map(({ id, name, description, created_at, user_id, is_active, revoked_at, has_metrics }) => ({
        id,
        name,
        description,
        created_at,
        user_id,
        is_active,
        revoked_at,
        has_metrics,
      })),
    );
  } catch (error) {
    console.error("Error listing API keys:", error);
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

// Update API key (name and/or description)
router.put("/:id", (req: Request<{ id: string }, {}, { name?: string; description?: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const key = database.getApiKeyById(id);
    if (!key) {
      return res.status(404).json({ error: "API key not found" });
    }

    if (name !== undefined) {
      database.updateApiKeyName(id, name);
    }
    if (description !== undefined) {
      database.updateApiKeyDescription(id, description || null);
    }

    const updatedName = name !== undefined ? name : key.name;
    const updatedDescription = description !== undefined ? description : key.description;

    res.json({ message: "Updated", name: updatedName, description: updatedDescription });
  } catch (error) {
    console.error("Error updating API key:", error);
    res.status(500).json({ error: "Failed to update API key" });
  }
});

// Revoke API key
router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    
    const key = database.getApiKeyById(id);
    if (!key) {
      return res.status(404).json({ error: "API key not found" });
    }

    database.deleteApiKey(id);

    const hasMetrics = database.checkApiKeyHasMetrics(id);

    if (hasMetrics) {
      return res.json({ message: "API key revoked", action: "revoked" });
    } else {
      database.permanentlyDeleteApiKey(id);
      return res.json({ message: "API key deleted", action: "deleted" });
    }
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

// Get API key stats
router.get("/:id/stats", (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const stats = database.getApiKeyStats(id);

    if (!stats) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error getting API key stats:", error);
    res.status(500).json({ error: "Failed to get API key stats" });
  }
});

export default router;
