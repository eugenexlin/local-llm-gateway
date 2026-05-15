import "dotenv/config";
import * as crypto from "crypto";
import { Request } from "express";

interface Config {
  port: number;
  frontendBaseUrl: string;
  llamaCppUrl: string;
  databasePath: string;
  secretKey: string;
  sessionExpiryHours: number;
  googleClientId: string;
  googleClientSecret: string;
  allowedDomains: string[];
}

const generateSecureSecret = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:5173",
  llamaCppUrl: process.env.LLAMA_CPP_URL || "http://localhost:8080/v1",
  databasePath: process.env.DATABASE_PATH || "./local_llm_gateway.db",
  secretKey: process.env.SESSION_SECRET || generateSecureSecret(),
  sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || "24", 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  allowedDomains: process.env.ALLOWED_DOMAINS
    ? process.env.ALLOWED_DOMAINS.split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
    : [],
};

/**
 * Build the base URL (protocol + host) from an incoming request.
 * Checks X-Forwarded-Host / X-Forwarded-Proto (set by reverse proxies)
 * first, then falls back to the Host header, then to the static config.
 */
export const getBaseUrl = (req: Request): string => {
  // Check if we have a whitelist of allowed domains
  const hasWhitelist = config.allowedDomains.length > 0;

  // Try X-Forwarded-Host / X-Forwarded-Proto (set by nginx/reverse proxy)
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

    // If whitelist exists, validate the host against it
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

  // Fall back to Host header
  const hostHeader = req.headers["host"];
  if (hostHeader) {
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    const url = `${req.protocol}://${host}`;

    if (!hasWhitelist) {
      return url;
    }

    // Validate against whitelist
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

  // Final fallback to static config
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

  return config.frontendBaseUrl;
};

/**
 * Get the origin (protocol + host without path) for CORS validation.
 */
export const getOrigin = (req: Request): string => {
  const baseUrl = getBaseUrl(req);
  // Ensure it ends with a trailing slash for origin comparison
  return baseUrl.replace(/\/+$/, "");
};

export default config;
