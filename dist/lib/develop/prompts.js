import { z } from "zod";
import { keywordsRequest, validatePathParam } from "../shared/client.js";
export function registerPromptTools(server, auth) {
    // 1. List all Prompts
    server.tool("list_prompts", `List all prompts in your Keywords AI organization.

Returns a paginated list of all prompts you have created in Keywords AI.

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
Use get_prompt_detail to see full prompt content, or list_prompt_versions to see all versions.`, {
        page_size: z.number().optional().describe("Number of prompts per page (1-50, default 50)")
    }, async ({ page_size = 50 }) => {
        const limit = Math.min(page_size, 50);
        const data = await keywordsRequest("prompts/", auth, { queryParams: { page_size: limit } });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    // 2. Get single Prompt details
    server.tool("get_prompt_detail", `Retrieve detailed information about a specific prompt.

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

Use list_prompts first to find the prompt_id.`, {
        prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)")
    }, async ({ prompt_id }) => {
        const safeId = validatePathParam(prompt_id, "prompt_id");
        const data = await keywordsRequest(`prompts/${safeId}/`, auth);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    // 3. List versions of a specific Prompt
    server.tool("list_prompt_versions", `List all versions of a specific prompt.

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

Use list_prompts first to find the prompt_id.`, {
        prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)")
    }, async ({ prompt_id }) => {
        const safeId = validatePathParam(prompt_id, "prompt_id");
        const data = await keywordsRequest(`prompts/${safeId}/versions/`, auth);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    // 4. Get details of a specific Prompt version
    server.tool("get_prompt_version_detail", `Retrieve detailed information about a specific version of a prompt.

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

Use list_prompts to find prompt_id, then list_prompt_versions to find the version number.`, {
        prompt_id: z.string().describe("Unique prompt identifier (from list_prompts)"),
        version: z.number().describe("Version number (integer, e.g. 1, 2, 3 — from the 'version' field in list_prompt_versions)")
    }, async ({ prompt_id, version }) => {
        const safePromptId = validatePathParam(prompt_id, "prompt_id");
        const data = await keywordsRequest(`prompts/${safePromptId}/versions/${version}/`, auth);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
}
