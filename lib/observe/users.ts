// lib/observe/users.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";

export function registerUserTools(server: McpServer) {
  // --- List Customers ---
  server.tool(
    "list_customers",
    "Get customer list with sorting by cost, number of requests, etc.",
    {
      page_size: z.number().optional().describe("Items per page (max 50)"),
      sort_by: z.string().optional().describe("Sort by: '-total_cost', '-number_of_requests', 'email' [cite: 17, 18]"),
      environment: z.string().optional().describe("Environment: 'prod' or 'test' [cite: 19]")
    },
    async ({ page_size = 20, sort_by = "-first_seen", environment }, extra) => {
      const data = await keywordsRequest("users/list/", extra, {
        queryParams: { page_size: Math.min(page_size, 50), sort_by, environment }
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Get Customer Detail ---
  server.tool(
    "get_customer_budget_detail",
    "Get customer's detailed information and budget usage",
    {
      customer_identifier: z.string().describe("Unique identifier of the customer [cite: 81]")
    },
    async ({ customer_identifier }, extra) => {
      const data = await keywordsRequest(`users/${customer_identifier}/`, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}