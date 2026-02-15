// lib/observe/traces.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";

export function registerTraceTools(server: McpServer) {
  // --- List Traces ---
  server.tool(
    "list_traces",
    `List and filter traces with sorting and pagination support.

A trace represents a complete workflow execution containing multiple spans (individual operations).

QUERY PARAMETERS:
- page_size: Results per page (max 20 for MCP, API supports up to 1000)
- page: Page number (default 1)
- sort_by: Sort field with optional - prefix for descending. IMPORTANT: Do NOT wrap the value in quotes, pass the raw value directly.
  Options: timestamp, start_time, end_time, duration, total_cost, total_tokens,
           total_prompt_tokens, total_completion_tokens, span_count, llm_call_count, error_count
  Example: -total_cost (highest cost first)
- start_time: ISO 8601 datetime (default: 1 hour ago)
- end_time: ISO 8601 datetime (default: current time)
- environment: Filter by environment (e.g., "production", "test")

FILTERS (in request body):
Pass filters as an object where each key is a field name and value contains operator and value array.

Filter Operators:
- "" (empty): Equal/exact match
- "not": Not equal
- "lt", "lte": Less than, less than or equal
- "gt", "gte": Greater than, greater than or equal
- "contains", "icontains": Contains (case sensitive/insensitive)
- "startswith", "endswith": String prefix/suffix match
- "in": Value in list
- "isnull": Check if null

Filterable Fields:
- trace_unique_id: Unique trace identifier
- customer_identifier: Customer/user identifier
- environment: Environment name
- span_count: Total spans in trace
- llm_call_count: Number of LLM calls
- error_count: Number of errors
- total_cost: Total cost in USD
- total_tokens, total_prompt_tokens, total_completion_tokens: Token counts
- duration: Total duration in seconds
- workflow_name (span_workflow_name): Workflow identifier
- Custom metadata: Use "metadata__your_field" prefix

EXAMPLE FILTERS:
{
  "total_cost": {"operator": "gte", "value": [0.01]},
  "environment": {"operator": "", "value": ["production"]},
  "error_count": {"operator": "gt", "value": [0]},
  "customer_identifier": {"operator": "", "value": ["user@example.com"]}
}

RESPONSE FIELDS:
- trace_unique_id: Unique identifier
- start_time, end_time: Trace time range
- duration: Total duration in seconds
- span_count: Number of spans
- llm_call_count: Number of LLM API calls
- total_prompt_tokens, total_completion_tokens, total_tokens: Token usage
- total_cost: Cost in USD
- error_count: Number of errors
- input, output: Root span's input/output
- metadata: Custom metadata
- customer_identifier: User identifier
- environment: Environment name
- trace_group_identifier: Workflow group
- name: Root span name
- model: Primary model used`,
    {
      page_size: z.number().optional().describe("Results per page (1-20, default 10)"),
      page: z.number().optional().describe("Page number (default 1)"),
      sort_by: z.string().optional().describe("Sort field. IMPORTANT: pass raw value without quotes. Valid values: timestamp, -timestamp, duration, -duration, total_cost, -total_cost, error_count, -error_count. Prefix - for descending."),
      start_time: z.string().optional().describe("Start time in ISO 8601 format (e.g., '2024-01-15T00:00:00Z'). Default: 1 hour ago"),
      end_time: z.string().optional().describe("End time in ISO 8601 format. Default: current time"),
      environment: z.string().optional().describe("Filter by environment (e.g., 'production', 'test')"),
      filters: z.record(z.string(), z.object({
        operator: z.string().describe("Filter operator: '', 'not', 'lt', 'lte', 'gt', 'gte', 'contains', 'icontains', 'startswith', 'endswith', 'in', 'isnull'"),
        value: z.array(z.any()).describe("Filter value(s) as array")
      })).optional().describe("Filter object. Keys are field names, values have 'operator' and 'value' array.")
    },
    async ({ page_size = 10, page = 1, sort_by = "-timestamp", start_time, end_time, environment, filters }, extra) => {
      const limit = Math.min(page_size, 20);

      // Strip surrounding quotes that LLMs sometimes add (e.g. '"-timestamp"' -> '-timestamp')
      const cleanSortBy = sort_by.replace(/^["']|["']$/g, "");

      const queryParams: Record<string, any> = {
        page_size: limit,
        page,
        sort_by: cleanSortBy
      };
      
      if (start_time) queryParams.start_time = start_time;
      if (end_time) queryParams.end_time = end_time;
      if (environment) queryParams.environment = environment;
      
      const data = await keywordsRequest("traces/list/", extra, {
        method: "POST",
        queryParams,
        body: { filters: filters || {} }
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Get Trace Tree ---
  server.tool(
    "get_trace_tree",
    `Retrieve the complete hierarchical span tree of a single trace.

Returns detailed trace information with the full span_tree structure showing:
- All spans in the trace with parent-child relationships
- Full input/output for each span
- Timing and performance metrics per span
- Model and token usage per LLM span
- Nested children spans forming the execution tree

TRACE FIELDS:
- trace_unique_id: Unique identifier
- start_time, end_time: Trace time range
- duration: Total duration in seconds
- span_count: Total number of spans
- llm_call_count: Number of LLM calls
- total_prompt_tokens, total_completion_tokens, total_tokens: Aggregate token usage
- total_cost: Total cost in USD
- error_count: Number of errors
- metadata: Custom metadata object
- customer_identifier: User identifier
- environment: Environment name

SPAN TREE STRUCTURE:
Each span in span_tree contains:
- span_unique_id: Unique span identifier
- span_name: Name of the operation
- span_parent_id: Parent span ID (null for root)
- log_type: Span type (CHAT, COMPLETION, FUNCTION, TASK, WORKFLOW, etc.)
- start_time, timestamp: Span timing
- latency: Duration in seconds
- input: Full span input data
- output: Full span output data
- model: Model used (for LLM spans)
- prompt_tokens, completion_tokens: Token counts
- cost: Cost in USD
- status: Status (success, error)
- status_code: HTTP-like status code
- children: Array of nested child spans

Use list_traces first to find trace_unique_id, then use this for full span tree.`,
    {
      trace_id: z.string().describe("Trace unique ID (trace_unique_id field from list_traces)"),
      environment: z.string().optional().describe("Environment filter (if trace exists in multiple environments)"),
      start_time: z.string().optional().describe("Start time filter in ISO 8601 format"),
      end_time: z.string().optional().describe("End time filter in ISO 8601 format")
    },
    async ({ trace_id, environment, start_time, end_time }, extra) => {
      const queryParams: Record<string, any> = {};
      if (environment) queryParams.environment = environment;
      if (start_time) queryParams.start_time = start_time;
      if (end_time) queryParams.end_time = end_time;
      
      const data = await keywordsRequest(`traces/${trace_id}/`, extra, { queryParams });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
