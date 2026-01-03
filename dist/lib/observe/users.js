import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";
export function registerUserTools(server) {
    // --- List Customers ---
    server.tool("list_customers", `List customers/users with pagination and sorting.

Retrieves a paginated list of customers who have made API requests through Keywords AI.

QUERY PARAMETERS:
- page_size: Number of customers per page (max 50 for MCP, API supports up to 1000)
- page: Page number (default 1)
- sort_by: Sort field with optional '-' prefix for descending
  Options: customer_identifier, email, first_seen, last_active_timeframe, 
           number_of_requests, total_cost, total_tokens, active_days,
           average_latency, average_ttft
  Examples: "-total_cost" (highest spending first), "-number_of_requests" (most active first)
- environment: Filter by environment ("prod" or "test")

RESPONSE FIELDS:
- id: Unique internal identifier
- customer_identifier: Your unique identifier for this customer
- email: Customer email (if provided)
- name: Customer name (if provided)
- environment: Environment (prod/test)
- first_seen: First activity timestamp
- last_active_timeframe: Last activity timestamp
- active_days: Number of days with activity
- number_of_requests: Total API requests made
- total_tokens: Total tokens used
- total_cost: Total cost in USD
- average_latency: Average response time in seconds
- average_ttft: Average time to first token in seconds

Use this to identify top users by cost, most active users, or find specific customers.`, {
        page_size: z.number().optional().describe("Customers per page (1-50, default 20)"),
        page: z.number().optional().describe("Page number (default 1)"),
        sort_by: z.string().optional().describe("Sort field: 'customer_identifier', '-total_cost', '-number_of_requests', 'email', '-first_seen', '-last_active_timeframe', '-active_days', '-total_tokens'. Prefix '-' for descending."),
        environment: z.string().optional().describe("Filter by environment: 'prod' or 'test'")
    }, async ({ page_size = 20, page = 1, sort_by = "-first_seen", environment }, extra) => {
        const queryParams = {
            page_size: Math.min(page_size, 50),
            page,
            sort_by
        };
        if (environment)
            queryParams.environment = environment;
        const data = await keywordsRequest("users/list/", extra, { queryParams });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    // --- Get Customer Detail ---
    server.tool("get_customer_detail", `Retrieve detailed information about a specific customer including budget usage.

Returns comprehensive customer data including:

IDENTIFICATION:
- customer_identifier: Your unique identifier for this customer
- email: Customer email (if provided)
- name: Customer name (if provided)
- environment: Environment (prod/test)

BUDGET & SPENDING:
- period_budget: Budget limit for current period (USD)
- budget_duration: Budget period type (e.g., "monthly")
- total_period_usage: Spending in current period (USD)
- period_start: Current budget period start
- period_end: Current budget period end (null if ongoing)
- total_budget: Lifetime budget limit (null if unlimited)
- total_usage: Lifetime total spending (USD)

USAGE METRICS:
- total_requests: Total number of API requests
- total_prompt_tokens: Total input tokens used
- total_completion_tokens: Total output tokens used
- total_tokens: Total tokens (input + output)
- total_cache_hits: Number of cache hits

PERFORMANCE:
- average_latency: Average response time in seconds
- average_ttft: Average time to first token in seconds
- average_monthly_cost: Average monthly spending

ACTIVITY:
- last_active: Last activity timestamp
- created_at: Customer record creation time
- updated_at: Last update timestamp
- top_models: Most used models (object)

OTHER:
- metadata: Custom metadata (if set)
- markup_percentage: Price markup for this customer
- is_test: Whether this is a test customer

Use list_customers first to find customer_identifier, then use this for full details.`, {
        customer_identifier: z.string().describe("Unique identifier of the customer (from list_customers)"),
        environment: z.string().optional().describe("Environment: 'prod' or 'test' (default: 'prod')")
    }, async ({ customer_identifier, environment }, extra) => {
        const queryParams = {};
        if (environment)
            queryParams.environment = environment;
        const data = await keywordsRequest(`users/${customer_identifier}/`, extra, { queryParams });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
}
