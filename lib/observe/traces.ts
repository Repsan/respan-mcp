// lib/observe/traces.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AuthConfig, keywordsRequest, validatePathParam } from "../shared/client.js";

export function registerTraceTools(server: McpServer, auth: AuthConfig) {
  // --- List Traces ---
  server.tool(
    "list_traces",
    `List and filter traces with sorting, pagination, and powerful server-side filtering via the "filters" parameter.

A trace represents a complete workflow execution containing multiple spans (individual operations).

PARAMETERS:
- page_size: Results per page (1-20, default 10)
- page: Page number (default 1)
- sort_by: Sort field with optional - prefix for descending (e.g. "-total_cost", "duration")
- start_time / end_time: ISO 8601 time range (default: last 1 hour)
- environment: Filter by environment (e.g. "production", "test")
- filters: Server-side filters object (see below)

FILTERS PARAMETER:
Pass the "filters" parameter to filter traces server-side by any field. It is an object where each key is a filterable field name and the value is {"operator": "<op>", "value": [<values>]}.

Operators: "" (exact match), "not", "lt", "lte", "gt", "gte", "icontains", "startswith", "endswith", "in", "isnull"

Filterable fields:
- trace_unique_id, customer_identifier, environment
- span_count, llm_call_count, error_count
- total_cost, total_tokens, total_prompt_tokens, total_completion_tokens
- duration
- workflow_name (span_workflow_name)
- Custom metadata: Use "metadata__<key>" (e.g. "metadata__session_id")

EXAMPLE - calling this tool with filters:
{
  "page_size": 10,
  "sort_by": "-total_cost",
  "filters": {
    "customer_identifier": {"operator": "", "value": ["user@example.com"]},
    "total_cost": {"operator": "gte", "value": [0.01]},
    "error_count": {"operator": "gt", "value": [0]}
  }
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
      sort_by: z.enum(["timestamp", "-timestamp", "start_time", "-start_time", "end_time", "-end_time", "duration", "-duration", "total_cost", "-total_cost", "total_tokens", "-total_tokens", "total_prompt_tokens", "-total_prompt_tokens", "total_completion_tokens", "-total_completion_tokens", "span_count", "-span_count", "llm_call_count", "-llm_call_count", "error_count", "-error_count"]).optional().describe("Sort field. Prefix with - for descending order."),
      start_time: z.string().optional().describe("Start time in ISO 8601 format. Default: 1 hour ago"),
      end_time: z.string().optional().describe("End time in ISO 8601 format. Default: current time"),
      environment: z.string().optional().describe("Filter by environment (e.g., 'production', 'test')"),
      filters: z.record(z.string(), z.object({
        operator: z.string().describe("Filter operator: '', 'not', 'lt', 'lte', 'gt', 'gte', 'icontains', 'startswith', 'endswith', 'in', 'isnull'"),
        value: z.array(z.any()).describe("Filter value(s) as array")
      })).optional().describe("Filter object. Keys are field names, values have 'operator' and 'value' array.")
    },
    async ({ page_size = 10, page = 1, sort_by = "-timestamp", start_time, end_time, environment, filters }) => {
      const limit = Math.min(page_size, 20);

      const queryParams: Record<string, any> = { page_size: limit, page, sort_by };
      if (start_time) queryParams.start_time = start_time;
      if (end_time) queryParams.end_time = end_time;
      if (environment) queryParams.environment = environment;

      const data = await keywordsRequest("traces/list/", auth, {
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
    async ({ trace_id, environment, start_time, end_time }) => {
      const safeId = validatePathParam(trace_id, "trace_id");
      const queryParams: Record<string, any> = {};
      if (environment) queryParams.environment = environment;
      if (start_time) queryParams.start_time = start_time;
      if (end_time) queryParams.end_time = end_time;

      const data = await keywordsRequest(`traces/${safeId}/`, auth, { queryParams });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
