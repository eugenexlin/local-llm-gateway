import config, { ServerConfig, ModelConfig } from '../config';

export interface ModelHealth {
  name: string;
  url: string;
  healthy: boolean;
  error?: string;
}

export interface ServerHealth {
  name: string;
  healthy: boolean;
  models: ModelHealth[];
  lastChecked: string;
}

const serverHealthMap = new Map<string, ServerHealth>();

export async function checkServerHealth(server: ServerConfig): Promise<ServerHealth> {
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

  const health: ServerHealth = {
    name: server.name,
    healthy: models.every(m => m.healthy),
    models,
    lastChecked: new Date().toISOString(),
  };

  serverHealthMap.set(server.name, health);
  return health;
}

export function getServerHealth(): ServerHealth[] {
  return Array.from(serverHealthMap.values());
}

export function startServerHealthChecks(): void {
  config.servers.forEach(s => checkServerHealth(s));
  setInterval(() => {
    config.servers.forEach(s => checkServerHealth(s));
  }, 60000);
}