import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";
export function registerLogTools(server) {
    // --- List Logs ---
    server.tool("list_logs", `List and filter LLM request logs with powerful query capabilities.

QUERY PARAMETERS:
- page_size: Number of logs per page (max 50 for MCP, API supports up to 1000)
- page: Page number (default 1)
- sort_by: Sort field with optional '-' prefix for descending
  Options: id, cost, latency, time_to_first_token, prompt_tokens, completion_tokens, all_tokens
  Example: "-cost" (highest cost first), "latency" (lowest latency first)
- start_time: ISO 8601 datetime (default: 1 hour ago)
- end_time: ISO 8601 datetime (default: current time)
- is_test: "true" or "false" - filter by environment
- all_envs: "true" or "false" - include all environments

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
- "isnull": Check if null (value: [true] or [false])

Filterable Fields:
- Identifiers: customer_identifier, custom_identifier, thread_identifier, prompt_id, unique_id
- Tracing: trace_unique_id, span_name, span_workflow_name
- Model/Provider: model, deployment_name, provider_id
- Status: status_code, status, error_message, failed
- Metrics: cost, latency, tokens_per_second, time_to_first_token, prompt_tokens, completion_tokens
- Config: environment, log_type, stream, temperature, max_tokens
- Custom metadata: Use "metadata__your_field" prefix

EXAMPLE FILTERS:
{
  "cost": {"operator": "gt", "value": [0.01]},
  "model": {"operator": "", "value": ["gpt-4"]},
  "customer_identifier": {"operator": "contains", "value": ["user"]},
  "metadata__session_id": {"operator": "", "value": ["abc123"]}
}`, {
        page_size: z.number().optional().describe("Number of logs per page (1-50, default 20)"),
        page: z.number().optional().describe("Page number (default 1)"),
        sort_by: z.string().optional().describe("Sort field: 'id', '-id', 'cost', '-cost', 'latency', '-latency', 'prompt_tokens', 'completion_tokens', 'time_to_first_token'. Prefix '-' for descending."),
        start_time: z.string().optional().describe("Start time in ISO 8601 format (e.g., '2024-01-15T00:00:00Z'). Default: 1 hour ago"),
        end_time: z.string().optional().describe("End time in ISO 8601 format. Default: current time"),
        is_test: z.boolean().optional().describe("Filter by test environment (true) or production (false)"),
        all_envs: z.boolean().optional().describe("Include logs from all environments"),
        filters: z.record(z.string(), z.object({
            operator: z.string().describe("Filter operator: '', 'not', 'lt', 'lte', 'gt', 'gte', 'contains', 'icontains', 'startswith', 'endswith', 'in', 'isnull'"),
            value: z.array(z.any()).describe("Filter value(s) as array")
        })).optional().describe("Filter object. Keys are field names, values have 'operator' and 'value' array.")
    }, async ({ page_size = 20, page = 1, sort_by = "-id", start_time, end_time, is_test, all_envs, filters }, extra) => {
        // Enforce safety limit to prevent context overflow
        const limit = Math.min(page_size, 50);
        const queryParams = {
            page_size: limit,
            page,
            sort_by
        };
        if (start_time)
            queryParams.start_time = start_time;
        if (end_time)
            queryParams.end_time = end_time;
        if (is_test !== undefined)
            queryParams.is_test = is_test.toString();
        if (all_envs !== undefined)
            queryParams.all_envs = all_envs.toString();
        const data = await keywordsRequest("request-logs/list/", extra, {
            method: "POST",
            queryParams,
            body: { filters: filters || {} }
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    // --- Get Single Log ---
    server.tool("get_log_detail", `Retrieve complete details of a single log by its unique ID.

Returns full information including:
- Full input/output content (input and output fields)
- Type-specific fields based on log_type (chat, embedding, workflow, etc.)
- Credit and budget check results (limit_info)
- Evaluation scores
- Complete request/response metadata
- Tool calls and function calling details

The limit_info field shows:
- is_allowed: Whether the request was allowed
- limits: Array of limit checks (org_credits, customer_budget)
  - current_value: Balance before request
  - new_value: Balance after request  
  - limit_value: Minimum required balance
  - is_within_limit: Whether check passed

Use list_logs first to find the unique_id, then use this endpoint for full details.`, {
        log_id: z.string().describe("Unique identifier of the log (unique_id field from list_logs)")
    }, async ({ log_id }, extra) => {
        const data = await keywordsRequest(`request-logs/${log_id}/`, extra);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
}
