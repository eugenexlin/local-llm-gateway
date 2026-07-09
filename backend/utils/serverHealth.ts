import config, { ServerConfig, ServerEndpoint } from '../config';

export interface EndpointHealth {
  url: string;
  healthy: boolean;
  models: string[];
  error?: string;
}

export interface ServerHealth {
  id: string;
  name?: string;
  healthy: boolean;
  endpoints: EndpointHealth[];
  lastChecked: string;
}

const serverHealthMap = new Map<string, ServerHealth>();

export async function checkServerHealth(server: ServerConfig): Promise<ServerHealth> {
  const endpoints: EndpointHealth[] = await Promise.all(
    server.endpoints.map(async (ep) => {
      const health: EndpointHealth = {
        url: ep.url,
        healthy: false,
        models: ep.models,
      };

      try {
        const url = new URL(ep.url);
        const modelUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}/models`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(modelUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const parsed: any = await response.json();
          health.healthy = true;
          health.models = parsed.data?.map((m: any) => m.id) || [];
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
    id: server.id,
    name: server.name || server.id,
    healthy: endpoints.every(ep => ep.healthy),
    endpoints,
    lastChecked: new Date().toISOString(),
  };

  serverHealthMap.set(server.id, health);
  return health;
}

export function getServerHealth(): ServerHealth[] {
  return Array.from(serverHealthMap.values());
}

export function startServerHealthChecks(): void {
  config.servers.forEach(s => checkServerHealth(s));
  setInterval(() => {
    config.servers.forEach(s => checkServerHealth(s));
  }, 30000);
}