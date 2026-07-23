/**
 * DisclosureDiff MCP — runtime configuration.
 * SEC fair-access requires a descriptive User-Agent with contact email.
 */

export interface AppConfig {
  contactEmail: string;
  userAgent: string;
  port: number;
  host: string;
  apiKeys: Set<string>;
  allowAnonymous: boolean;
  anonymousRpm: number;
  authenticatedRpm: number;
  secMinIntervalMs: number;
  cacheDir: string;
  auditLogPath: string;
  metricsPath: string;
  nodeEnv: string;
}

function parseKeys(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const contactEmail =
    env.SEC_CONTACT_EMAIL?.trim() || "contact@example.com";
  const version = env.npm_package_version || "0.1.0";

  return {
    contactEmail,
    userAgent: `DisclosureDiffMCP/${version} (${contactEmail})`,
    port: Number(env.PORT || 8787),
    host: env.HOST || "0.0.0.0",
    apiKeys: parseKeys(env.API_KEYS),
    allowAnonymous: env.ALLOW_ANONYMOUS !== "false",
    anonymousRpm: Number(env.ANONYMOUS_RPM || 30),
    authenticatedRpm: Number(env.AUTHENTICATED_RPM || 120),
    // SEC asks for max 10 requests/second; stay conservative at ~5/sec
    secMinIntervalMs: Number(env.SEC_MIN_INTERVAL_MS || 200),
    cacheDir: env.CACHE_DIR || ".cache/filings",
    auditLogPath: env.AUDIT_LOG_PATH || "audit-logs/tool-calls.jsonl",
    metricsPath: env.METRICS_PATH || "metrics.jsonl",
    nodeEnv: env.NODE_ENV || "development",
  };
}
