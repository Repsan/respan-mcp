import { z } from "zod";
import { keywordsRequest } from "../shared/client.js";
export function registerPromptTools(server) {
    // 1. Get all Prompts list
    // Corresponding API: GET https://api.keywordsai.co/api/prompts/ [cite: 157]
    server.tool("list_prompts", "Get all Prompts list with pagination support", {
        page_size: z.number().optional().describe("Number of Prompts returned per page, default 100")
    }, async ({ page_size = 100 }, extra) => {
        // No strict limit for now, allow larger range fetching 
        const data = await keywordsRequest("prompts/", extra, { queryParams: { page_size } });
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
    });
    // 2. Get single Prompt details
    // Corresponding API: GET https://api.keywordsai.co/api/prompts/<prompt_id>/ [cite: 161]
    server.tool("get_prompt_detail", "Get detailed information of a specified Prompt", {
        prompt_id: z.string().describe("Unique identifier ID of the Prompt")
    }, async ({ prompt_id }, extra) => {
        const data = await keywordsRequest(`prompts/${prompt_id}/`, extra);
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
    });
    // 3. Get version list of a specific Prompt
    // Corresponding API: GET https://api.keywordsai.co/api/prompts/<prompt_id>/versions/ 
    server.tool("list_prompt_versions", "Get all version list of a specified Prompt", {
        prompt_id: z.string().describe("Unique identifier ID of the Prompt")
    }, async ({ prompt_id }, extra) => {
        const data = await keywordsRequest(`prompts/${prompt_id}/versions/`, extra);
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
    });
    // 4. Get details of a specific Prompt version
    // Corresponding API: GET api/prompts/<prompt_id>/versions/<version_id>/ [cite: 155]
    server.tool("get_prompt_version_detail", "Get detailed information of a specific version of a specified Prompt", {
        prompt_id: z.string().describe("Unique identifier ID of the Prompt"),
        version_id: z.string().describe("Unique identifier ID of the version")
    }, async ({ prompt_id, version_id }, extra) => {
        const data = await keywordsRequest(`prompts/${prompt_id}/versions/${version_id}/`, extra);
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
    });
}
//# sourceMappingURL=prompts.js.map