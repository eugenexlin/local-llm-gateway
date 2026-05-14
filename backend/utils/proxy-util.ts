import http from "http";
import https from "https";
import { Response } from "express";
import database from "../database";
import config from "../config";
import { extractTokensFromStream } from "./streaming-token-parser";

interface StreamMetrics {
  statusCode: number | null;
  startTime: number;
  error: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  chunks: Buffer[];
  idempotencyKey: string | null;
  hasLogged: boolean;
  usageFound: boolean;
}

export function proxyRequestToLlama(
  fullUrl: string,
  body: any,
  apiKeyId: string | undefined,
  method: string,
  res: Response,
  reqHeaders: any,
): void {
  if (!body.stream_options) {
    body.stream_options = {};
  }
  if (!body.stream_options.include_usage) {
    body.stream_options.include_usage = true;
  }

  const idempotencyKey = (reqHeaders["idempotency-key"] ||
    reqHeaders["x-idempotency-key"] ||
    null) as string | null;

  const metrics: StreamMetrics = {
    statusCode: null,
    startTime: Date.now(),
    error: null,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    chunks: [],
    idempotencyKey,
    hasLogged: false,
    usageFound: false,
  };

  const url = new URL(fullUrl);
  const protocol = url.protocol === "https:" ? https : http;

  const contentType =
    (reqHeaders["content-type"] as string) || "application/json";

  const options: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: url.pathname + url.search,
    method: method,
    headers: {
      "Content-Type": contentType,
      "User-Agent": "LLM-Gateway/1.0",
    },
  };

  const upstreamReq = protocol.request(
    options,
    (response: http.IncomingMessage) => {
      metrics.statusCode = response.statusCode ?? null;
      response.pipe(res);

      response.on("data", (chunk: Buffer) => {
        metrics.chunks.push(chunk);
      });

      response.on("end", () => {
        const duration = Date.now() - metrics.startTime;

        if (metrics.idempotencyKey) {
          const existing = database
            .getDb()
            ?.prepare("SELECT 1 FROM usage_logs WHERE idempotency_key = ?")
            .get(metrics.idempotencyKey);

          if (existing) {
            if (process.env.SUPPRESS_CONSOLE !== "true") {
              console.log(
                "Duplicate request detected (idempotency key already used), skipping logging",
              );
            }
            metrics.hasLogged = true;
            return;
          }
        }

        const tokenResult = extractTokensFromStream(metrics.chunks);
        if (tokenResult) {
          metrics.promptTokens = tokenResult.promptTokens;
          metrics.completionTokens = tokenResult.completionTokens;
          metrics.totalTokens = tokenResult.totalTokens;
          metrics.usageFound = true;
        }

        setImmediate(() => {
          try {
            if (!metrics.usageFound || metrics.hasLogged) {
              return;
            }

            if (apiKeyId) {
              database.logUsage({
                api_key_id: apiKeyId,
                prompt_tokens: metrics.promptTokens,
                completion_tokens: metrics.completionTokens,
                total_tokens: metrics.totalTokens,
                duration_ms: duration,
                timestamp: new Date().toISOString(),
                idempotency_key: metrics.idempotencyKey,
                cache_creation_input_tokens:
                  tokenResult?.cacheCreationInputTokens || 0,
                cache_read_input_tokens: tokenResult?.cacheReadInputTokens || 0,
              });

              database.incrementApiKeyStats(apiKeyId);
            }

            metrics.hasLogged = true;
          } catch (logError) {
            console.error("Error logging response:", logError);
          }
        });

        console.log(
          `[${metrics.statusCode}] ${duration}ms | Prompt:${metrics.promptTokens} Completion:${metrics.completionTokens} Total:${metrics.totalTokens}`,
        );
      });
    },
  );

  upstreamReq.on("error", (error: Error) => {
    metrics.error = error.message;
    const duration = Date.now() - metrics.startTime;

    console.error("Proxy error:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }

    if (!metrics.usageFound && !metrics.hasLogged) {
      setImmediate(() => {
        try {
          if (apiKeyId) {
            database.logUsage({
              api_key_id: apiKeyId,
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
              duration_ms: duration,
              timestamp: new Date().toISOString(),
              idempotency_key: metrics.idempotencyKey,
            });
          }
          metrics.hasLogged = true;
        } catch (logError) {
          console.error("Error logging error:", logError);
        }
      });
    }
  });

  upstreamReq.write(JSON.stringify(body));
  upstreamReq.end();

  // Detect client disconnect and abort upstream request
  res.on("close", () => {
    if (!res.headersSent) {
      upstreamReq.destroy();
    }
  });

  // Log if client disconnected during streaming
  if (process.env.SUPPRESS_CONSOLE !== "true") {
    res.on("finish", () => {
      if (res.writableEnded && !metrics.usageFound) {
        console.log("[ABORTED] Client disconnected before stream completed");
      }
    });
  }
}
