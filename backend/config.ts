import "dotenv/config";
import * as crypto from "crypto";
import { Request } from "express";

export interface ServerEndpoint {
  url: string;
  models: string[];
}

export interface ServerConfig {
  id: string;
  name?: string;
  endpoints: ServerEndpoint[];
  agentUrl?: string | null;
}

interface Config {
  port: number;
  frontendBaseUrl: string;
  llamaCppUrl: string;
  databasePath: string;
  secretKey: string;
  sessionExpiryHours: number;
  upstreamTimeoutMs: number;
  googleClientId: string;
  googleClientSecret: string;
  allowedDomains: string[];
  servers: ServerConfig[];
  agentMode: boolean;
}

const generateSecureSecret = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

const serversEnv = process.env.SERVERS;
let servers: ServerConfig[] = [];

if (serversEnv) {
  try {
    const parsed = JSON.parse(serversEnv);
    servers = parsed.map((s: any) => {
      if (s.url) {
        console.log(`[CONFIG] Auto-wrapping legacy server format for "${s.id}"`);
        return {
          id: s.id,
          name: s.name || s.id,
          endpoints: [{ url: s.url, models: s.models || [] }],
          agentUrl: s.agentUrl || null,
        };
      }
      return s;
    });
  } catch {
    console.error('Failed to parse SERVERS env var, falling back to LLAMA_CPP_URL');
    servers = [];
  }
}

if (servers.length === 0) {
  const llamaCppUrl = process.env.LLAMA_CPP_URL || "http://localhost:8080/v1";
  servers = [{
    id: 'local',
    name: 'Local',
    endpoints: [{ url: llamaCppUrl, models: [] }],
    agentUrl: null,
  }];
}

const agentMode = process.env.AGENT_MODE === 'true';

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:5173",
  llamaCppUrl: process.env.LLAMA_CPP_URL || "http://localhost:8080/v1",
  databasePath: process.env.DATABASE_PATH || "backend/data/database.sqlite",
  secretKey: process.env.SESSION_SECRET || generateSecureSecret(),
  sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || "24", 10),
  upstreamTimeoutMs: parseInt(process.env.UPSTREAM_TIMEOUT_MS || "3600000", 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  allowedDomains: process.env.ALLOWED_DOMAINS
    ? process.env.ALLOWED_DOMAINS.split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
    : [],
  servers,
  agentMode,
};

/**
 * Select the appropriate server and endpoint for a given model name.
 * First checks for explicit model match, then falls back to catch-all endpoint.
 */
export const selectServer = (modelName: string): { server: ServerConfig; endpoint: ServerEndpoint } | null => {
  if (!modelName) {
    for (const server of config.servers) {
      for (const endpoint of server.endpoints) {
        if (endpoint.models.length === 0) {
          return { server, endpoint };
        }
      }
    }
    if (config.servers[0]) {
      const server = config.servers[0];
      const endpoint = server.endpoints[0];
      if (endpoint) {
        return { server, endpoint };
      }
    }
    return null;
  }

  for (const server of config.servers) {
    for (const endpoint of server.endpoints) {
      if (endpoint.models.length > 0 && endpoint.models.includes(modelName)) {
        return { server, endpoint };
      }
    }
  }

  for (const server of config.servers) {
    for (const endpoint of server.endpoints) {
      if (endpoint.models.length === 0) {
        return { server, endpoint };
      }
    }
  }

  return null;
};

/**
 * Get all configured servers.
 */
export const getServers = (): ServerConfig[] => {
  return config.servers;
};

/**
 * Get all distinct models across all servers and endpoints.
 */
export const getAllModels = (): string[] => {
  const models = new Set<string>();
  for (const server of config.servers) {
    for (const endpoint of server.endpoints) {
      for (const model of endpoint.models) {
        models.add(model);
      }
    }
  }
  return Array.from(models);
};

/**
 * Build the base URL (protocol + host) from an incoming request.
 * Checks X-Forwarded-Host / X-Forwarded-Proto (set by reverse proxies)
 * first, then falls back to the Host header, then to the static config.
 */
export const getBaseUrl = (req: Request): string => {
  const hasWhitelist = config.allowedDomains.length > 0;

  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"];

  if (forwardedHost) {
    const host = Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost;
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    const url = `${proto || "http"}://${host}`;

    if (!hasWhitelist) {
      return url;
    }

    const hostOnly = host.includes(":") ? host.split(":")[0] : host;
    const port = host.includes(":") ? host.split(":")[1] : "";
    const matches = config.allowedDomains.some((domain) => {
      const domainHost = domain.includes(":") ? domain.split(":")[0] : domain;
      const domainPort = domain.includes(":") ? domain.split(":")[1] : "";
      return hostOnly === domainHost && (!domainPort || port === domainPort);
    });
    if (matches) {
      return url;
    }
  }

  const hostHeader = req.headers["host"];
  if (hostHeader) {
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    const url = `${req.protocol}://${host}`;

    if (!hasWhitelist) {
      return url;
    }

    const hostOnly = host.includes(":") ? host.split(":")[0] : host;
    const port = host.includes(":") ? host.split(":")[1] : "";
    const matches = config.allowedDomains.some((domain) => {
      const domainHost = domain.includes(":") ? domain.split(":")[0] : domain;
      const domainPort = domain.includes(":") ? domain.split(":")[1] : "";
      return hostOnly === domainHost && (!domainPort || port === domainPort);
    });
    if (matches) {
      return url;
    }
  }

  return config.frontendBaseUrl;
};

/**
 * Get the frontend URL for OAuth redirects.
 * When behind a reverse proxy (X-Forwarded-Host present), uses the public-facing domain.
 * When accessed directly (dev mode), falls back to the configured frontend URL.
 */
export const getFrontendUrl = (req: Request): string => {
  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"];

  if (forwardedHost) {
    const host = Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost;
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    return `${proto || "http"}://${host}`;
  }

  const hostHeader = req.headers["host"];
  if (hostHeader) {
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    if (!host.includes(":")) {
      return `${req.protocol}://${host}`;
    }
  }

  return config.frontendBaseUrl;
};

/**
 * Get the origin (protocol + host without path) for CORS validation.
 */
export const getOrigin = (req: Request): string => {
  const baseUrl = getBaseUrl(req);
  return baseUrl.replace(/\/+$/, "");
};

export default config;