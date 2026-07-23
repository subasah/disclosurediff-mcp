#!/usr/bin/env node
/**
 * DisclosureDiff MCP entrypoint.
 * TRANSPORT=stdio (default for bin) | http
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDisclosureDiffServer } from "./server.js";
import { startHttpServer } from "./http/app.js";
import { loadConfig } from "./config.js";

async function main(): Promise<void> {
  const transport = (process.env.TRANSPORT || "stdio").toLowerCase();
  const cfg = loadConfig();

  if (transport === "http" || transport === "streamable-http") {
    await startHttpServer();
    return;
  }

  const server = createDisclosureDiffServer();
  const stdio = new StdioServerTransport();
  await server.connect(stdio);
  console.error(`DisclosureDiff MCP (stdio) ready — ${cfg.userAgent}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
