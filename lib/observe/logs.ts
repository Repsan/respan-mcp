// lib/observe/logs.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AuthConfig, keywordsRequest, validatePathParam } from "../shared/client.js";

export function registerLogTools(server: McpServer, auth: AuthConfig) {
  // --- List Logs ---
  server.tool(
    "list_logs",
    `List and filter LLM request logs via POST /api/request-logs/list/.

QUERY PARAMETERS:
- page_size: Number of logs per page (max 50 for MCP, API supports up to 1000)
- page: Page number (default 1)
- sort_by: Sort field. Prefix with - for descending order.
  Example: -cost (highest cost first), latency (lowest latency first)
- start_time: ISO 8601 datetime (default: 1 hour ago)
- end_time: ISO 8601 datetime (default: current time)
- is_test: "true" or "false" - filter by environment
- all_envs: "true" or "false" - include all environments

FILTERS (passed in POST body):
Pass filters as an object where each key is a field name and value contains operator and value array.
Filters are sent in the request body as { filters: { ... } }.

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

By default, only summary fields are returned to keep responses lightweight.
Use include_fields to customize which fields are returned, or use get_log_detail for full log data including input/output.

EXAMPLE FILTERS:
{
  "cost": {"operator": "gt", "value": [0.01]},
  "model": {"operator": "", "value": ["gpt-4"]},
  "customer_identifier": {"operator": "contains", "value": ["user"]},
  "metadata__session_id": {"operator": "", "value": ["abc123"]}
}`,
    {
      page_size: z.number().optional().describe("Number of logs per page (1-50, default 20)"),
      page: z.number().optional().describe("Page number (default 1)"),
      sort_by: z.enum(["id", "-id", "cost", "-cost", "latency", "-latency", "time_to_first_token", "-time_to_first_token", "prompt_tokens", "-prompt_tokens", "completion_tokens", "-completion_tokens", "all_tokens", "-all_tokens"]).optional().describe("Sort field. Prefix with - for descending order."),
      start_time: z.string().optional().describe("Start time in ISO 8601 format. Default: 1 hour ago. Maximum: 1 week ago"),
      end_time: z.string().optional().describe("End time in ISO 8601 format. Default: current time"),
      is_test: z.boolean().optional().describe("Filter by test environment (true) or production (false)"),
      all_envs: z.boolean().optional().describe("Include logs from all environments"),
      filters: z.record(z.string(), z.object({
        operator: z.string().describe("Filter operator: '', 'not', 'lt', 'lte', 'gt', 'gte', 'contains', 'icontains', 'startswith', 'endswith', 'in', 'isnull'"),
        value: z.array(z.any()).describe("Filter value(s) as array")
      })).optional().describe("Filter object. Keys are field names, values have 'operator' and 'value' array."),
      include_fields: z.array(z.string()).optional().describe("Fields to include in response. Defaults to summary fields (unique_id, model, cost, status_code, latency, timestamp, customer_identifier, prompt_tokens, completion_tokens, status, error_message, log_type). Use get_log_detail for full log data.")
    },
    async ({ page_size = 20, page = 1, sort_by = "-id", start_time, end_time, is_test, all_envs, filters, include_fields }) => {
      const limit = Math.min(page_size, 50);

      const queryParams: Record<string, any> = {
        page_size: limit,
        page,
        sort_by,
        fetch_filters: "false",
      };
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const resolvedStart = start_time || oneHourAgo;
      // Clamp: don't allow start_time older than 1 week
      queryParams.start_time = new Date(resolvedStart) < oneWeekAgo ? oneWeekAgo.toISOString() : resolvedStart;
      if (end_time) queryParams.end_time = end_time;
      if (is_test !== undefined) queryParams.is_test = is_test.toString();
      if (all_envs !== undefined) queryParams.all_envs = all_envs.toString();

      // Default summary fields to keep responses lightweight; use get_log_detail for full data
      const DEFAULT_FIELDS = [
        "unique_id", "model", "cost", "status_code", "latency", "timestamp",
        "customer_identifier", "prompt_tokens", "completion_tokens", "status",
        "error_message", "log_type", "time_to_first_token", "tokens_per_second"
      ];
      queryParams.include_fields = (include_fields || DEFAULT_FIELDS).join(",");

      // Convert filters to the backend body format: { field: { operator, value } }
      const bodyFilters: Record<string, any> = {};
      if (filters) {
        for (const [field, filter] of Object.entries(filters)) {
          bodyFilters[field] = {
            value: filter.value,
            operator: filter.operator || "",
          };
        }
      }

      const data = await keywordsRequest("request-logs/list/", auth, {
        method: "POST",
        queryParams,
        body: {
          filters: bodyFilters,
          exporting: false,
        },
      });

      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Get Single Log ---
  server.tool(
    "get_log_detail",
    `Retrieve complete details of a single log via GET /api/request-logs/{id}/.

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

Use list_logs first to find the unique_id, then use this endpoint for full details.`,
    {
      log_id: z.string().describe("Unique identifier of the log (unique_id field from list_logs)")
    },
    async ({ log_id }) => {
      const safeId = validatePathParam(log_id, "log_id");
      const data = await keywordsRequest(`request-logs/${safeId}/`, auth);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Create Log ---
  server.tool(
    "create_log",
    `Create a new log entry for any type of LLM request using Keywords AI's universal input/output design.

CORE FIELDS:
- input: Universal input field (string/object/array) - structure depends on log_type
- output: Universal output field (string/object/array) - structure depends on log_type
- log_type: Type of span - "chat" (default), "completion", "embedding", "transcription", "speech",
            "workflow", "agent", "task", "tool", "function", "generation", "handoff", "guardrail", "custom"
- model: Model used for inference (e.g., "gpt-4o-mini")

TELEMETRY:
- usage: Token usage object with prompt_tokens, completion_tokens, total_tokens
- cost: Cost in USD (auto-calculated if not provided)
- latency: Total request latency in seconds
- time_to_first_token: TTFT in seconds
- tokens_per_second: Generation speed

METADATA & TRACKING:
- metadata: Custom key-value pairs for analytics
- customer_identifier: User/customer identifier
- customer_params: Extended customer info (customer_identifier, name, email)
- thread_identifier: Conversation thread ID
- custom_identifier: Indexed custom identifier
- group_identifier: Group related logs

WORKFLOW & TRACING:
- trace_unique_id: Link spans in distributed tracing
- span_workflow_name: Workflow name
- span_name: Span/task name
- span_parent_id: Parent span ID for hierarchy

CONFIGURATION:
- temperature: Randomness control (0-2)
- top_p: Nucleus sampling
- max_tokens: Maximum tokens to generate
- stop: Stop sequences array
- stream: Whether response was streamed
- prompt_id: Prompt template ID
- response_format: Response format config

ERROR HANDLING:
- status_code: HTTP status code (default: 200)
- error_message: Error description
- status: Request status ("success", "error")
- warnings: Warnings object

EXAMPLE - Chat completion:
{
  "input": "[{\\"role\\":\\"user\\",\\"content\\":\\"Hello\\"}]",
  "output": "{\\"role\\":\\"assistant\\",\\"content\\":\\"Hi! How can I help?\\"}",
  "log_type": "chat",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 10, "completion_tokens": 8, "total_tokens": 18},
  "latency": 0.5,
  "customer_identifier": "user_123"
}

Note: Maximum log size is 20MB including all fields.`,
    {
      input: z.union([z.string(), z.any()]).optional().describe("Universal input field - structure depends on log_type (string, object, or array)"),
      output: z.union([z.string(), z.any()]).optional().describe("Universal output field - structure depends on log_type (string, object, or array)"),
      log_type: z.string().optional().describe("Span type: chat, completion, embedding, transcription, speech, workflow, agent, task, tool, function, generation, handoff, guardrail, custom"),
      model: z.string().optional().describe("Model used for inference (e.g., 'gpt-4o-mini')"),
      usage: z.object({
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
        total_tokens: z.number().optional(),
        prompt_tokens_details: z.any().optional(),
        cache_creation_prompt_tokens: z.number().optional()
      }).optional().describe("Token usage information"),
      cost: z.number().optional().describe("Cost in USD (auto-calculated if not provided)"),
      latency: z.number().optional().describe("Total request latency in seconds"),
      time_to_first_token: z.number().optional().describe("Time to first token in seconds"),
      tokens_per_second: z.number().optional().describe("Generation speed in tokens/second"),
      metadata: z.record(z.string(), z.any()).optional().describe("Custom key-value pairs for analytics"),
      customer_identifier: z.string().optional().describe("User/customer identifier"),
      customer_params: z.object({
        customer_identifier: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional()
      }).optional().describe("Extended customer information"),
      thread_identifier: z.string().optional().describe("Conversation thread ID"),
      custom_identifier: z.string().optional().describe("Indexed custom identifier for fast querying"),
      group_identifier: z.string().optional().describe("Group identifier for related logs"),
      trace_unique_id: z.string().optional().describe("Unique trace ID for linking spans"),
      span_workflow_name: z.string().optional().describe("Workflow name"),
      span_name: z.string().optional().describe("Span/task name"),
      span_parent_id: z.string().optional().describe("Parent span ID for hierarchy"),
      tools: z.array(z.any()).optional().describe("Tools array for function calling"),
      tool_choice: z.union([z.string(), z.any()]).optional().describe("Tool choice control"),
      temperature: z.number().optional().describe("Randomness control (0-2)"),
      top_p: z.number().optional().describe("Nucleus sampling parameter"),
      frequency_penalty: z.number().optional().describe("Frequency penalty"),
      presence_penalty: z.number().optional().describe("Presence penalty"),
      max_tokens: z.number().optional().describe("Maximum tokens to generate"),
      stop: z.array(z.string()).optional().describe("Stop sequences"),
      stream: z.boolean().optional().describe("Whether response was streamed"),
      response_format: z.any().optional().describe("Response format configuration"),
      prompt_id: z.string().optional().describe("Prompt template ID"),
      prompt_name: z.string().optional().describe("Prompt template name"),
      is_custom_prompt: z.boolean().optional().describe("Whether using custom prompt"),
      status_code: z.number().optional().describe("HTTP status code (default: 200)"),
      error_message: z.string().optional().describe("Error message if request failed"),
      warnings: z.union([z.string(), z.any()]).optional().describe("Warnings that occurred"),
      status: z.string().optional().describe("Request status (success, error)"),
      timestamp: z.string().optional().describe("ISO 8601 timestamp when request completed"),
      start_time: z.string().optional().describe("ISO 8601 timestamp when request started"),
      full_request: z.any().optional().describe("Full request object for additional params"),
      full_response: z.any().optional().describe("Full response object from provider"),
      prompt_unit_price: z.number().optional().describe("Custom price per 1M prompt tokens"),
      completion_unit_price: z.number().optional().describe("Custom price per 1M completion tokens"),
      keywordsai_api_controls: z.object({
        block: z.boolean().optional()
      }).optional().describe("API behavior controls"),
      positive_feedback: z.boolean().optional().describe("User feedback (true = positive)")
    },
    async (params) => {
      const data = await keywordsRequest("request-logs/", auth, {
        method: "POST",
        body: params
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
