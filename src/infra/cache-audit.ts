import { createHash } from "node:crypto";
import { mkdir, appendFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadConfig } from "../config.js";

export interface CacheEntry<T> {
  key: string;
  storedAt: string;
  value: T;
}

/**
 * Filesystem cache keyed by CIK + accession (+ optional suffix).
 * Suitable for Workers/Railway local disk or bind-mounted volumes.
 */
export class FilingCache {
  constructor(private readonly rootDir: string = loadConfig().cacheDir) {}

  private pathFor(key: string): string {
    const hash = createHash("sha256").update(key).digest("hex").slice(0, 32);
    return join(this.rootDir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await readFile(this.pathFor(key), "utf8");
      const entry = JSON.parse(raw) as CacheEntry<T>;
      return entry.value;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    const entry: CacheEntry<T> = {
      key,
      storedAt: new Date().toISOString(),
      value,
    };
    await writeFile(path, JSON.stringify(entry), "utf8");
  }

  static key(cik: string, accession: string, suffix = ""): string {
    return `${cik}:${accession}${suffix ? `:${suffix}` : ""}`;
  }
}

export class AuditLogger {
  private lastHash = "GENESIS";

  constructor(private readonly path: string = loadConfig().auditLogPath) {}

  /**
   * Append a tamper-evident (hash-chained) audit record for each tool call.
   * Never logs secrets (API keys, Authorization headers).
   */
  async log(record: {
    tool: string;
    argsSummary: Record<string, unknown>;
    ok: boolean;
    durationMs: number;
    citationCount: number;
    error?: string;
    clientId?: string;
  }): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const payload = {
      ts: new Date().toISOString(),
      prevHash: this.lastHash,
      ...record,
    };
    const line = JSON.stringify(payload);
    const hash = createHash("sha256")
      .update(this.lastHash + line)
      .digest("hex");
    this.lastHash = hash;
    await appendFile(this.path, JSON.stringify({ ...payload, hash }) + "\n");
  }
}

export class MetricsHook {
  constructor(private readonly path: string = loadConfig().metricsPath) {}

  async record(event: {
    type: "tool_call" | "http_request" | "health" | "rate_limited";
    name?: string;
    ok?: boolean;
    meta?: Record<string, string | number | boolean>;
  }): Promise<void> {
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(
        this.path,
        JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n",
      );
    } catch {
      // metrics must never break the request path
    }
  }
}
