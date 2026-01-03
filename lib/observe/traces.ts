// lib/observe/traces.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";

export function registerTraceTools(server: McpServer) {
  // --- List Traces ---
  server.tool(
    "list_traces",
    "Get Traces list with filtering and sorting support",
    {
      page_size: z.number().optional().describe("Number of items returned (MCP limit max 20)"),
      sort_by: z.string().optional().describe("Sort field: 'duration', 'total_cost', 'error_count'"),
      filters: z.record(z.string(), z.any()).optional().describe("Filter fields like trace_unique_id, environment, total_tokens [cite: 135]")
    },
    async ({ page_size = 10, sort_by = "-timestamp", filters }, extra) => {
      const limit = Math.min(page_size, 20);
      const data = await keywordsRequest("traces/list/", extra, {
        method: "POST",
        queryParams: { page_size: limit, sort_by },
        body: { filters: filters || {} }
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Get Trace Tree ---
  server.tool(
    "get_trace_tree",
    "Get the complete tree structure of a single Trace",
    {
      trace_id: z.string().describe("Trace unique ID (trace_unique_id) [cite: 107]")
    },
    async ({ trace_id }, extra) => {
      const data = await keywordsRequest(`traces/${trace_id}/`, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}