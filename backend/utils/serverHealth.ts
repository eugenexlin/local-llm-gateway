import config, { ServerConfig, ModelConfig } from '../config';
import { getRemoteServerStatus } from '../utils/systemMetrics';

export interface ModelInfo {
  id: string;
  configuredName: string;
  contextLength: number | null;
  provider?: string;
  ownedBy?: string;
  created?: number;
}

export interface ModelHealth {
  name: string;
  url: string;
  healthy: boolean;
  error?: string;
}

export interface ServerHealth {
  name: string;
  healthy: boolean;
  offline?: boolean;
  models: ModelHealth[];
  lastChecked: string;
}

const serverHealthMap = new Map<string, ServerHealth>();
const modelInfoMap = new Map<string, ModelInfo>();

const extractContextLength = (model: any): number | null => {
  if (typeof model.context_length === "number") return model.context_length;
  if (typeof model.max_context_length === "number") return model.max_context_length;
  if (typeof model.max_position_embeddings === "number") return model.max_position_embeddings;
  if (typeof model.context_window === "number") return model.context_window;
  if (typeof model.max_model_len === "number") return model.max_model_len;
  if (model.top_provider && typeof model.top_provider.context_length === "number") return model.top_provider.context_length;
  if (model.meta && typeof model.meta.n_ctx === "number") return model.meta.n_ctx;
  if (model.metadata && typeof model.metadata.context_length === "number") return model.metadata.context_length;
  if (model.metadata && typeof model.metadata.max_context_length === "number") return model.metadata.max_context_length;
  return null;
};

const matchUpstreamModel = (upstreamModels: any[], configuredName: string): any | null => {
  if (upstreamModels.length === 1) {
    return upstreamModels[0];
  }
  for (const m of upstreamModels) {
    const candidates = [m.id, m.name, ...(m.aliases || [])].filter(Boolean);
    if (candidates.some(c => c === configuredName)) return m;
    if (candidates.some(c => c.toLowerCase() === configuredName.toLowerCase())) return m;
    if (candidates.some(c => c.toLowerCase().includes(configuredName.toLowerCase()))) return m;
    if (candidates.some(c => configuredName.toLowerCase().includes(c.toLowerCase()))) return m;
  }
  return null;
};

const fetchModelInfo = async (server: ServerConfig): Promise<void> => {
  try {
    const serverUrl = server.models[0]?.url;
    if (!serverUrl) return;

    const url = new URL(serverUrl);
    const modelsUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}/models`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(modelsUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return;

    const data: any = await response.json();
    const upstreamModels = data.data || [];

    for (const configuredModel of server.models) {
      const match = matchUpstreamModel(upstreamModels, configuredModel.name);
      if (!match) continue;

      const upstreamId = match.id || match.name;
      const contextLength = extractContextLength(match);
      modelInfoMap.set(configuredModel.name, {
        id: upstreamId,
        configuredName: configuredModel.name,
        contextLength,
        provider: match.provider || undefined,
        ownedBy: match.owned_by || undefined,
        created: match.created || undefined,
      });
    }
  } catch {
    // Silently fail — model info is optional
  }
};

export async function checkServerHealth(server: ServerConfig): Promise<ServerHealth> {
  if (server.models.length > 0) {
    await fetchModelInfo(server);
  }

  const models: ModelHealth[] = await Promise.all(
    server.models.map(async (model) => {
      const health: ModelHealth = {
        name: model.name,
        url: model.url,
        healthy: false,
      };

      try {
        const url = new URL(model.url);
        const modelUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}/models`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(modelUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          health.healthy = true;
        } else {
          health.error = `HTTP ${response.status}`;
        }
      } catch (err: any) {
        health.error = err.message;
      }

      return health;
    })
  );

  const remoteStatus = getRemoteServerStatus();
  const offline = remoteStatus[server.name]?.offline || false;

  const health: ServerHealth = {
    name: server.name,
    healthy: models.every(m => m.healthy),
    offline,
    models,
    lastChecked: new Date().toISOString(),
  };

  serverHealthMap.set(server.name, health);
  return health;
}

export function getServerHealth(): ServerHealth[] {
  return Array.from(serverHealthMap.values());
}

export function getModelInfo(): Record<string, ModelInfo> {
  const result: Record<string, ModelInfo> = {};
  for (const [key, value] of modelInfoMap.entries()) {
    result[key] = value;
  }
  return result;
}

export function startServerHealthChecks(): void {
  config.servers.forEach(s => checkServerHealth(s));
  setInterval(() => {
    config.servers.forEach(s => checkServerHealth(s));
  }, 60000);
}