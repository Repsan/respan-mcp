// api/mcp.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLogTools } from "../lib/observe/logs.js";
import { registerTraceTools } from "../lib/observe/traces.js";
import { registerUserTools } from "../lib/observe/users.js";
import { registerPromptTools } from "../lib/develop/prompts.js";
import { createMcpHandler } from "mcp-handler";

// Export as HTTP handler for Vercel
export default createMcpHandler((server: McpServer) => {
  registerLogTools(server);
  registerTraceTools(server);
  registerUserTools(server);
  registerPromptTools(server);
});