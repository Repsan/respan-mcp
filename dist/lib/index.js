#!/usr/bin/env node
// Main entry point for Keywords AI MCP Server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerLogTools } from "./observe/logs.js";
import { registerTraceTools } from "./observe/traces.js";
import { registerUserTools } from "./observe/users.js";
import { registerPromptTools } from "./develop/prompts.js";
async function main() {
    // Create the MCP server
    const server = new McpServer({
        name: "keywords-ai",
        version: "1.0.0",
    });
    // Register all tool categories
    registerLogTools(server);
    registerTraceTools(server);
    registerUserTools(server);
    registerPromptTools(server);
    // Use stdio transport for standard MCP communication
    const transport = new StdioServerTransport();
    // Connect and start the server
    await server.connect(transport);
    console.error("Keywords AI MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map