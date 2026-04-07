import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthenticatedClient } from "../shared/client.js";
import { requireClient } from "../shared/client.js";

export function registerExperimentTools(
  server: McpServer,
  client: AuthenticatedClient | null
) {
  // 1. List all Experiments
  server.tool(
    "list_experiments",
    "List all experiments in your organization.",
    {},
    async () => {
      const c = requireClient(client);
      const data = await c.client.experiments.listExperiments({ Authorization: c.auth });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 2. Get Experiment detail
  server.tool(
    "get_experiment",
    "Retrieve detailed information about a specific experiment by its ID.",
    {
      experiment_id: z
        .string()
        .describe("Unique experiment identifier (from list_experiments)"),
    },
    async ({ experiment_id }) => {
      const c = requireClient(client);
      const data = await c.client.experiments.retrieveExperiment({
        Authorization: c.auth,
        experiment_id,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 3. Create Experiment
  server.tool(
    "create_experiment",
    "Create a new experiment linked to a dataset. Optionally configure workflows and evaluators.",
    {
      name: z.string().describe("Name for the new experiment"),
      dataset_id: z
        .string()
        .describe("ID of the dataset to run the experiment against"),
      description: z
        .string()
        .optional()
        .describe("Optional description of the experiment's purpose"),
      workflows: z
        .array(
          z.object({
            type: z
              .enum(["custom", "completion", "prompt"])
              .describe(
                "Workflow type: 'custom' for user-defined logic, 'completion' for a model completion, 'prompt' for a saved prompt"
              ),
            config: z
              .record(z.any())
              .optional()
              .describe(
                "Workflow-specific configuration (e.g. model, prompt_id, parameters)"
              ),
          })
        )
        .optional()
        .describe("Array of workflow definitions to execute in the experiment"),
      evaluator_slugs: z
        .array(
          z
            .string()
            .describe("Slug identifier of an evaluator (from list_evaluators)")
        )
        .optional()
        .describe("Array of evaluator slugs to apply to experiment results"),
    },
    async ({ name, dataset_id, description, workflows, evaluator_slugs }) => {
      const c = requireClient(client);
      const data = await c.client.experiments.createExperiment({
        Authorization: c.auth,
        name,
        dataset_id,
        ...(description !== undefined ? { description } : {}),
        ...(workflows !== undefined ? { workflows } : {}),
        ...(evaluator_slugs !== undefined ? { evaluator_slugs } : {}),
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 4. List Experiment Spans
  server.tool(
    "list_experiment_spans",
    "List all spans (execution traces) for a specific experiment.",
    {
      experiment_id: z
        .string()
        .describe("Unique experiment identifier (from list_experiments)"),
    },
    async ({ experiment_id }) => {
      const c = requireClient(client);
      const data = await c.client.experiments.listExperimentSpans({
        Authorization: c.auth,
        experiment_id,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 5. Get single Experiment Span
  server.tool(
    "get_experiment_span",
    "Retrieve detailed information about a specific span within an experiment.",
    {
      experiment_id: z
        .string()
        .describe("Unique experiment identifier (from list_experiments)"),
      log_id: z
        .string()
        .describe("Unique span/log identifier (from list_experiment_spans)"),
    },
    async ({ experiment_id, log_id }) => {
      const c = requireClient(client);
      const data = await c.client.experiments.retrieveExperimentSpan({
        Authorization: c.auth,
        experiment_id,
        log_id,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 6. Update Experiment Span
  server.tool(
    "update_experiment_span",
    "Update a specific span in an experiment (e.g., submit custom workflow results).",
    {
      experiment_id: z
        .string()
        .describe("Unique experiment identifier (from list_experiments)"),
      log_id: z
        .string()
        .describe("Unique span/log identifier (from list_experiment_spans)"),
      body: z
        .record(z.any())
        .describe(
          "Object containing the fields to update on the span (e.g. output, metadata, status)"
        ),
    },
    async ({ experiment_id, log_id, body }) => {
      const c = requireClient(client);
      const data = await c.client.experiments.updateExperimentSpan({
        Authorization: c.auth,
        experiment_id,
        log_id,
        body,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 7. Get Experiment Spans Summary
  server.tool(
    "get_experiment_spans_summary",
    "Get aggregated summary statistics for experiment spans within a time range.",
    {
      experiment_id: z
        .string()
        .describe("Unique experiment identifier (from list_experiments)"),
      start_time: z
        .string()
        .describe("Start of the time range in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)"),
      end_time: z
        .string()
        .describe("End of the time range in ISO 8601 format (e.g. 2024-12-31T23:59:59Z)"),
    },
    async ({ experiment_id, start_time, end_time }) => {
      const c = requireClient(client);
      const data = await c.client.experiments.getExperimentSpansSummary({
        Authorization: c.auth,
        experiment_id,
        start_time,
        end_time,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
