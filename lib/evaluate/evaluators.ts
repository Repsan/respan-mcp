import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RespanClient } from '@respan/respan-api';
import { requireClient } from '../shared/client.js';

export function registerEvaluatorTools(server: McpServer, client: RespanClient | null) {
  server.tool(
    'list_evaluators',
    'List all evaluators in your organization with pagination.',
    {
      page_size: z.number().optional().describe('Number of evaluators to return per page.'),
      page: z.number().optional().describe('Page number for pagination.'),
    },
    async () => {
      const c = requireClient(client);
      const data = await c.evaluators.listEvaluators();
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
      const data = await c.evaluators.retrieveEvaluator({ evaluator_id });
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
        .record(z.any())
        .optional()
        .describe('Additional configuration key-value pairs for the evaluator.'),
      categorical_choices: z
        .array(z.object({ name: z.string(), value: z.any() }))
        .optional()
        .describe('Choices for categorical score value types. Each choice has a name and value.'),
      score_config: z
        .record(z.any())
        .optional()
        .describe('Configuration for how scores are calculated.'),
      passing_conditions: z
        .record(z.any())
        .optional()
        .describe('Conditions that determine whether an evaluation passes.'),
      llm_config: z
        .record(z.any())
        .optional()
        .describe('Configuration specific to LLM-based evaluators.'),
      code_config: z
        .record(z.any())
        .optional()
        .describe('Configuration specific to code-based evaluators.'),
    },
    async (params) => {
      const c = requireClient(client);
      const data = await c.evaluators.createEvaluator(params);
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
        .record(z.any())
        .optional()
        .describe('Updated configuration key-value pairs.'),
      score_config: z
        .record(z.any())
        .optional()
        .describe('Updated score calculation configuration.'),
      passing_conditions: z
        .record(z.any())
        .optional()
        .describe('Updated passing conditions.'),
      llm_config: z
        .record(z.any())
        .optional()
        .describe('Updated LLM-specific configuration.'),
      code_config: z
        .record(z.any())
        .optional()
        .describe('Updated code-specific configuration.'),
    },
    async ({ evaluator_id, name, description, configurations, score_config, passing_conditions, llm_config, code_config }) => {
      const c = requireClient(client);
      const updateBody: Record<string, unknown> = {};
      if (name !== undefined) updateBody.name = name;
      if (description !== undefined) updateBody.description = description;
      if (configurations !== undefined) updateBody.configurations = configurations;
      if (score_config !== undefined) updateBody.score_config = score_config;
      if (passing_conditions !== undefined) updateBody.passing_conditions = passing_conditions;
      if (llm_config !== undefined) updateBody.llm_config = llm_config;
      if (code_config !== undefined) updateBody.code_config = code_config;
      const data = await c.evaluators.updateEvaluator({
        evaluator_id,
        body: updateBody,
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
        .record(z.any())
        .optional()
        .describe('Additional parameters for the evaluator run.'),
    },
    async ({ evaluator_id, dataset_id, log_ids, params }) => {
      const c = requireClient(client);
      const runBody: Record<string, unknown> = {};
      if (dataset_id !== undefined) runBody.dataset_id = dataset_id;
      if (log_ids !== undefined) runBody.log_ids = log_ids;
      if (params !== undefined) runBody.params = params;
      const data = await c.evaluators.runEvaluator({
        evaluator_id,
        body: runBody,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
