// lib/observe/logs.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";

export function registerLogTools(server: McpServer) {
  // --- List Logs ---
  server.tool(
    "list_logs",
    "Get request log list with complex filtering and sorting support",
    {
      page_size: z.number().optional().describe("Number of logs per page (MCP limit max 50)"),
      sort_by: z.string().optional().describe("Sort field, e.g. '-id', 'cost', 'latency' [cite: 32]"),
      start_time: z.string().optional().describe("Start time (ISO 8601), default 1 hour ago [cite: 28]"),
      end_time: z.string().optional().describe("End time (ISO 8601), default current [cite: 29]"),
      filters: z.record(z.string(), z.any()).optional().describe("Complex filter object. Supports fields like cost, latency, model, etc. See Filters API Reference [cite: 57, 87]")
    },
    async ({ page_size = 20, sort_by = "-id", start_time, end_time, filters }, extra) => {
      // Enforce safety limit to prevent context overflow
      const limit = Math.min(page_size, 50); 
      
      const data = await keywordsRequest("request-logs/list/", extra, {
        method: "POST", // POST recommended to support complex filtering [cite: 23]
        queryParams: { page_size: limit, sort_by, start_time, end_time },
        body: { filters: filters || {} }
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Get Single Log ---
  server.tool(
    "get_log_detail",
    "Get detailed information of a single log",
    {
      log_id: z.string().describe("Unique identifier of the log (unique_id) [cite: 13]")
    },
    async ({ log_id }, extra) => {
      const data = await keywordsRequest(`request-logs/${log_id}/`, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}