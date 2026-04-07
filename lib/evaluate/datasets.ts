import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AuthenticatedClient } from '../shared/client.js';
import { requireClient } from '../shared/client.js';

export function registerDatasetTools(server: McpServer, client: AuthenticatedClient | null) {
  server.tool(
    'list_datasets',
    'List all datasets in your organization.',
    {
      page_size: z.number().optional().default(50).describe('Number of datasets to return per page. Defaults to 50.'),
      page: z.number().optional().describe('Page number for pagination.'),
    },
    async () => {
      const c = requireClient(client);
      const data = await c.client.datasets.listDatasets({ Authorization: c.auth });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'get_dataset',
    'Retrieve detailed information about a specific dataset.',
    {
      dataset_id: z.string().describe('The unique identifier of the dataset to retrieve.'),
    },
    async ({ dataset_id }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.retrieveDataset({ Authorization: c.auth, dataset_id });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'create_dataset',
    'Create a new dataset.',
    {
      name: z.string().describe('Name of the dataset.'),
      description: z.string().optional().describe('A description of the dataset.'),
    },
    async (params) => {
      const c = requireClient(client);
      const data = await c.client.datasets.createDataset({ Authorization: c.auth, ...params });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'update_dataset',
    "Update a dataset's name and/or description.",
    {
      dataset_id: z.string().describe('The unique identifier of the dataset to update.'),
      name: z.string().optional().describe('Updated name for the dataset.'),
      description: z.string().optional().describe('Updated description for the dataset.'),
    },
    async ({ dataset_id, name, description }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.updateDataset({
        Authorization: c.auth,
        dataset_id,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'list_dataset_spans',
    'List all spans (data points) in a dataset.',
    {
      dataset_id: z.string().describe('The unique identifier of the dataset.'),
      filters: z
        .record(z.any())
        .optional()
        .describe('Optional filter criteria to apply when listing spans.'),
    },
    async ({ dataset_id, filters }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.listDatasetSpans({
        Authorization: c.auth,
        dataset_id,
        ...(filters ? { filters } : {}),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'create_dataset_span',
    'Create a new span (data point) in a dataset. Requires input and output fields.',
    {
      dataset_id: z.string().describe('The unique identifier of the dataset.'),
      input: z.string().describe('The input data for the span (can be JSON string).'),
      output: z.string().describe('The output data for the span (can be JSON string).'),
      metadata: z.record(z.any()).optional().describe('Optional metadata key-value pairs.'),
    },
    async ({ dataset_id, input, output, metadata }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.createDatasetSpan({
        Authorization: c.auth,
        dataset_id,
        input,
        output,
        ...(metadata ? { metadata } : {}),
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'retrieve_dataset_span',
    'Retrieve a specific span from a dataset.',
    {
      dataset_id: z.string().describe('The unique identifier of the dataset.'),
      log_id: z.string().describe('The unique identifier of the span/log to retrieve.'),
    },
    async ({ dataset_id, log_id }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.retrieveDatasetSpan({ Authorization: c.auth, dataset_id, log_id });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'update_dataset_span',
    'Partially update a span in a dataset.',
    {
      dataset_id: z.string().describe('The unique identifier of the dataset.'),
      log_id: z.string().describe('The unique identifier of the span/log to update.'),
      body: z
        .record(z.any())
        .describe('The fields to update on the span.'),
    },
    async ({ dataset_id, log_id, body }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.updateDatasetSpan({
        Authorization: c.auth,
        dataset_id,
        log_id,
        body,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'add_spans_to_dataset',
    'Add existing log spans to a dataset by their IDs.',
    {
      dataset_id: z.string().describe('The unique identifier of the dataset.'),
      span_ids: z
        .array(z.string())
        .describe('Array of existing span IDs to add to the dataset.'),
    },
    async ({ dataset_id, span_ids }) => {
      const c = requireClient(client);
      const data = await c.client.datasets.addSpansToDataset({
        Authorization: c.auth,
        dataset_id,
        log_ids: span_ids,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
