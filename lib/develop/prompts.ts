import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RespanClient } from "@respan/respan-api";
import { requireClient } from "../shared/client.js";

export function registerPromptTools(server: McpServer, client: RespanClient | null) {
  // 1. List all Prompts
  server.tool(
    "list_prompts",
    `List all prompts in your Respan organization.

Returns a paginated list of all prompts you have created in Respan.

RESPONSE FIELDS (per prompt):
- id: Unique prompt identifier (use this for other prompt operations)
- name: Prompt name/title
- description: Prompt description
- created_at: Creation timestamp
- updated_at: Last modification timestamp
- is_active: Whether the prompt is active
- version_count: Number of versions
- current_version: Currently active version number
- tags: Array of tags for organization

Prompts are reusable templates that can have multiple versions.
Use get_prompt_detail to see full prompt content, or list_prompt_versions to see all versions.`,
    {
      page_size: z
        .number()
        .optional()
        .describe("Number of prompts per page (1-50, default 50)"),
    },
    async () => {
      const c = requireClient(client);
      const data = await c.prompts.retrievePrompts();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 2. Get single Prompt details
  server.tool(
    "get_prompt_detail",
    `Retrieve detailed information about a specific prompt.

Returns complete prompt data including:
- id: Unique prompt identifier
- name: Prompt name/title
- description: Prompt description
- messages: The prompt template messages (array of role/content objects)
- model: Default model for this prompt
- temperature: Default temperature setting
- max_tokens: Default max tokens setting
- created_at: Creation timestamp
- updated_at: Last modification timestamp
- is_active: Whether the prompt is active
- current_version: Currently active version
- version_count: Total number of versions
- tags: Array of tags
- metadata: Custom metadata object

The messages field contains the actual prompt template which may include:
- System messages with instructions
- User message templates with {{variables}}
- Assistant message examples

Use list_prompts first to find the prompt_id.`,
    {
      prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
    },
    async ({ prompt_id }) => {
      const c = requireClient(client);
      // SDK doesn't have a single-prompt retrieval; use retrievePrompts and filter
      const data = await (c.prompts as any).retrievePrompts({ prompt_id });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 3. List versions of a specific Prompt
  server.tool(
    "list_prompt_versions",
    `List all versions of a specific prompt.

Returns all versions of a prompt, allowing you to track changes over time.

RESPONSE FIELDS (per version):
- id: Version identifier
- version: Version number (integer, starts at 1)
- prompt_id: Parent prompt identifier
- messages: The prompt template for this version
- model: Model setting for this version
- temperature: Temperature setting for this version
- max_tokens: Max tokens setting for this version
- created_at: When this version was created
- is_active: Whether this is the active/deployed version
- change_notes: Notes describing changes in this version
- created_by: User who created this version

Each prompt can have multiple versions. Typically one version is marked as active
and used in production, while others are archived or in development.

Use list_prompts first to find the prompt_id.`,
    {
      prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
    },
    async ({ prompt_id }) => {
      const c = requireClient(client);
      const data = await c.prompts.retrieveVersions({ prompt_id });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 4. Get details of a specific Prompt version
  server.tool(
    "get_prompt_version_detail",
    `Retrieve detailed information about a specific version of a prompt.

Returns complete version data including:
- id: Version identifier
- version: Version number
- prompt_id: Parent prompt identifier
- messages: Full prompt template messages array
  - Each message has: role (system/user/assistant), content (template text)
  - Content may contain {{variable}} placeholders for dynamic values
- model: Model setting for this version
- temperature: Temperature setting (0.0-2.0)
- max_tokens: Maximum tokens for completion
- top_p: Top-p sampling parameter
- frequency_penalty: Frequency penalty (0.0-2.0)
- presence_penalty: Presence penalty (0.0-2.0)
- stop: Stop sequences array
- created_at: Creation timestamp
- updated_at: Last update timestamp
- is_active: Whether this version is active
- change_notes: Description of changes
- created_by: Creator information
- metadata: Custom metadata

Use list_prompts to find prompt_id, then list_prompt_versions to find the version number.`,
    {
      prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
      version: z
        .number()
        .describe(
          "Version number (integer, e.g. 1, 2, 3 — from the 'version' field in list_prompt_versions)"
        ),
    },
    async ({ prompt_id, version }) => {
      const c = requireClient(client);
      // SDK retrieveVersions handles both list and single retrieval via path
      const data = await (c.prompts as any).retrieveVersions({ prompt_id, version: String(version) });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 5. Create a new Prompt
  server.tool(
    "create_prompt",
    "Create a new prompt template. Only sets name and description. Use create_prompt_version to add content.",
    {
      name: z.string().describe("Name for the new prompt template"),
      description: z
        .string()
        .optional()
        .describe("Optional description of the prompt's purpose"),
    },
    async ({ name, description }) => {
      const c = requireClient(client);
      const data = await c.prompts.createPrompt({
        name,
        ...(description !== undefined ? { description } : {}),
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 6. Update Prompt metadata
  server.tool(
    "update_prompt",
    "Update a prompt's name and/or description.",
    {
      prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
      name: z.string().optional().describe("New name for the prompt"),
      description: z
        .string()
        .optional()
        .describe("New description for the prompt"),
    },
    async ({ prompt_id, name, description }) => {
      const c = requireClient(client);
      const updateBody: Record<string, unknown> = {};
      if (name !== undefined) updateBody.name = name;
      if (description !== undefined) updateBody.description = description;
      const data = await c.prompts.updatePrompt({
        prompt_id,
        body: updateBody,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 7. Create a new Prompt version
  server.tool(
    "create_prompt_version",
    "Create a new version of a prompt. The version is always created as NOT deployed.",
    {
      prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
      messages: z
        .array(
          z.object({
            role: z.string().describe("Message role (e.g. system, user, assistant)"),
            content: z
              .string()
              .describe(
                "Message content text, may include {{variable}} placeholders"
              ),
          })
        )
        .describe("Array of message objects defining the prompt template"),
      model: z
        .string()
        .describe("Model identifier to use for this version (e.g. gpt-4o) — required"),
      temperature: z
        .number()
        .optional()
        .describe("Sampling temperature (0.0-2.0)"),
      max_tokens: z
        .number()
        .optional()
        .describe("Maximum number of tokens for the completion"),
      top_p: z.number().optional().describe("Top-p (nucleus) sampling parameter"),
      frequency_penalty: z
        .number()
        .optional()
        .describe("Frequency penalty (0.0-2.0)"),
      presence_penalty: z
        .number()
        .optional()
        .describe("Presence penalty (0.0-2.0)"),
      stop: z
        .array(z.string().describe("A stop sequence string"))
        .optional()
        .describe("Array of stop sequences"),
    },
    async ({
      prompt_id,
      messages,
      model,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stop,
    }) => {
      const c = requireClient(client);
      // createVersion uses flat params; messages is string[] (JSON-encoded message objects)
      const messagesStr = messages.map((m: any) => JSON.stringify(m));
      const data = await c.prompts.createVersion({
        prompt_id,
        messages: messagesStr,
        model,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(max_tokens !== undefined ? { max_tokens } : {}),
        ...(top_p !== undefined ? { top_p } : {}),
        ...(frequency_penalty !== undefined ? { frequency_penalty } : {}),
        ...(presence_penalty !== undefined ? { presence_penalty } : {}),
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // 8. Update an existing Prompt version
  server.tool(
    "update_prompt_version",
    "Update an existing prompt version. Always keeps deploy: false.",
    {
      prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
      version: z
        .number()
        .describe(
          "Version number to update (integer, from list_prompt_versions)"
        ),
      messages: z
        .array(
          z.object({
            role: z.string().describe("Message role (e.g. system, user, assistant)"),
            content: z
              .string()
              .describe(
                "Message content text, may include {{variable}} placeholders"
              ),
          })
        )
        .optional()
        .describe("Updated array of message objects defining the prompt template"),
      model: z
        .string()
        .optional()
        .describe("Updated model identifier (e.g. gpt-4o)"),
      temperature: z
        .number()
        .optional()
        .describe("Updated sampling temperature (0.0-2.0)"),
      max_tokens: z
        .number()
        .optional()
        .describe("Updated maximum number of tokens for the completion"),
      top_p: z
        .number()
        .optional()
        .describe("Updated top-p (nucleus) sampling parameter"),
      frequency_penalty: z
        .number()
        .optional()
        .describe("Updated frequency penalty (0.0-2.0)"),
      presence_penalty: z
        .number()
        .optional()
        .describe("Updated presence penalty (0.0-2.0)"),
      stop: z
        .array(z.string().describe("A stop sequence string"))
        .optional()
        .describe("Updated array of stop sequences"),
    },
    async ({
      prompt_id,
      version,
      messages,
      model,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stop,
    }) => {
      const c = requireClient(client);
      const body: Record<string, unknown> = {
        deploy: false,
      };
      if (messages !== undefined) body.messages = messages;
      if (model !== undefined) body.model = model;
      if (temperature !== undefined) body.temperature = temperature;
      if (max_tokens !== undefined) body.max_tokens = max_tokens;
      if (top_p !== undefined) body.top_p = top_p;
      if (frequency_penalty !== undefined) body.frequency_penalty = frequency_penalty;
      if (presence_penalty !== undefined) body.presence_penalty = presence_penalty;
      if (stop !== undefined) body.stop = stop;

      const data = await c.prompts.updatePromptVersion({
        prompt_id,
        version: String(version),
        body,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
