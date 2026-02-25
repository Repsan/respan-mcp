#!/usr/bin/env node
// Entry point for Respan MCP Server (stdio mode)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveAuthFromEnv } from "./shared/client.js";
import { registerLogTools } from "./observe/logs.js";
import { registerTraceTools } from "./observe/traces.js";
import { registerUserTools } from "./observe/users.js";
import { registerPromptTools } from "./develop/prompts.js";

async function main() {
  const auth = resolveAuthFromEnv();

  const server = new McpServer({
    name: "respan",
    version: "1.0.0",
  });

  registerLogTools(server, auth);
  registerTraceTools(server, auth);
  registerUserTools(server, auth);
  registerPromptTools(server, auth);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Respan MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
