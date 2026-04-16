import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AuthenticatedClient } from '../shared/client.js';
import { requireClient } from '../shared/client.js';

function paginateEvaluatorResults(data: any, page?: number, pageSize?: number) {
  const normalizedPage = Math.max(page ?? 1, 1);
  const normalizedPageSize = Math.max(pageSize ?? 25, 1);

  if (Array.isArray(data)) {
    const start = (normalizedPage - 1) * normalizedPageSize;
    return data.slice(start, start + normalizedPageSize);
  }

  const results = Array.isArray(data?.results) ? data.results : null;
  if (!results) return data;

  const totalCount = typeof data.count === 'number' ? data.count : results.length;
  const start = (normalizedPage - 1) * normalizedPageSize;
  const end = start + normalizedPageSize;

  const buildLink = (targetPage: number) =>
    `?page=${targetPage}&page_size=${normalizedPageSize}`;

  return {
    ...data,
    results: results.slice(start, end),
    count: totalCount,
    next: end < totalCount ? buildLink(normalizedPage + 1) : null,
    previous: normalizedPage > 1 ? buildLink(normalizedPage - 1) : null,
  };
}

export function registerEvaluatorTools(server: McpServer, client: AuthenticatedClient | null) {
  server.tool(
    'list_evaluators',
    'List all evaluators in your organization with pagination.',
    {
      page_size: z.number().optional().default(25).describe('Number of evaluators to return per page. Defaults to 25.'),
      page: z.number().optional().describe('Page number for pagination.'),
    },
    async ({ page_size = 25, page }) => {
      const c = requireClient(client);
      // The evaluator list endpoint accepts pagination, but the pinned SDK typings do not expose it yet.
      const rawData = await c.client.evaluators.listEvaluators({
        Authorization: c.auth,
        ...(page !== undefined ? { page } : {}),
        ...(page_size !== undefined ? { page_size } : {}),
      } as any);
      const data = paginateEvaluatorResults(rawData, page, page_size);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'get_evaluator',
    'Retrieve detailed information about a specific evaluator.',
    {
      evaluator_id: z.string().describe('The unique identifier of the evaluator to retrieve.'),
    },
    async ({ evaluator_id }) => {
      const c = requireClient(client);
      const data = await c.client.evaluators.retrieveEvaluator({ Authorization: c.auth, evaluator_id });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'create_evaluator',
    'Create a new evaluator. Supports LLM, code, and human evaluator types.',
    {
      name: z.string().describe('Name of the evaluator.'),
      score_value_type: z
        .enum([
          'numerical',
          'percentage',
          'boolean',
          'categorical',
          'single_select',
          'multi_select',
          'comment',
        ])
        .describe('The type of score value this evaluator produces.'),
      type: z
        .enum(['llm', 'code', 'human'])
        .optional()
        .describe('The evaluator type: llm, code, or human.'),
      evaluator_slug: z.string().optional().describe('A unique slug identifier for the evaluator.'),
      description: z.string().optional().describe('A description of what this evaluator does.'),
      configurations: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional configuration key-value pairs for the evaluator.'),
      categorical_choices: z
        .array(z.object({ name: z.string(), value: z.any() }))
        .optional()
        .describe('Choices for categorical score value types. Each choice has a name and value.'),
      score_config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration for how scores are calculated.'),
      passing_conditions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Conditions that determine whether an evaluation passes.'),
      llm_config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration specific to LLM-based evaluators.'),
      code_config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration specific to code-based evaluators.'),
    },
    async (params) => {
      const c = requireClient(client);
      const data = await c.client.evaluators.createEvaluator({
        Authorization: c.auth,
        ...params,
        type: (params.type || 'llm') as any,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'update_evaluator',
    "Update an existing evaluator's configuration.",
    {
      evaluator_id: z.string().describe('The unique identifier of the evaluator to update.'),
      name: z.string().optional().describe('Updated name for the evaluator.'),
      description: z.string().optional().describe('Updated description for the evaluator.'),
      configurations: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated configuration key-value pairs.'),
      score_config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated score calculation configuration.'),
      passing_conditions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated passing conditions.'),
      llm_config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated LLM-specific configuration.'),
      code_config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated code-specific configuration.'),
    },
    async ({ evaluator_id, name, description, configurations, score_config, passing_conditions, llm_config, code_config }) => {
      const c = requireClient(client);
      const data = await c.client.evaluators.updateEvaluator({
        Authorization: c.auth,
        evaluator_id,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(configurations !== undefined ? { configurations } : {}),
        ...(score_config !== undefined ? { score_config } : {}),
        ...(passing_conditions !== undefined ? { passing_conditions } : {}),
        ...(llm_config !== undefined ? { llm_config } : {}),
        ...(code_config !== undefined ? { code_config } : {}),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'run_evaluator',
    'Run an evaluator against a dataset or specific logs.',
    {
      evaluator_id: z.string().describe('The unique identifier of the evaluator to run.'),
      dataset_id: z.string().optional().describe('The dataset ID to run the evaluator against.'),
      log_ids: z
        .array(z.string())
        .optional()
        .describe('Specific log IDs to run the evaluator against.'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional parameters for the evaluator run.'),
    },
    async ({ evaluator_id, dataset_id, log_ids, params }) => {
      const c = requireClient(client);
      const data = await c.client.evaluators.runEvaluator({
        Authorization: c.auth,
        evaluator_id,
        ...(dataset_id !== undefined ? { dataset_id } : {}),
        ...(log_ids !== undefined ? { log_ids } : {}),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
