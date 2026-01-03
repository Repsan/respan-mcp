import { registerLogTools } from "../lib/observe/logs.js";
import { registerTraceTools } from "../lib/observe/traces.js";
import { registerUserTools } from "../lib/observe/users.js";
import { registerPromptTools } from "../lib/develop/prompts.js";
import { createMcpHandler } from "mcp-handler";
import { setRequestApiKey } from "../lib/shared/client.js";
// Create the base MCP handler (Web Fetch API)
const mcpHandler = createMcpHandler((server) => {
    registerLogTools(server);
    registerTraceTools(server);
    registerUserTools(server);
    registerPromptTools(server);
});
// Convert Vercel Request to Web Request
function toWebRequest(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'] || 'localhost';
    const url = `${protocol}://${host}${req.url}`;
    // Convert body to string if it exists
    let bodyString = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    return new Request(url, {
        method: req.method,
        headers: req.headers,
        body: bodyString,
    });
}
// Export Vercel-compatible handler that extracts API key from query parameter
export default async function handler(req, res) {
    try {
        // Priority: 1. URL query parameter, 2. Environment variable
        const apiKey = req.query.apikey || process.env.KEYWORDS_API_KEY;
        if (!apiKey) {
            return res.status(401).json({
                error: "No API Key provided. Use ?apikey=YOUR_KEY or set KEYWORDS_API_KEY environment variable."
            });
        }
        setRequestApiKey(apiKey);
        // Convert to Web Request
        const webRequest = toWebRequest(req);
        // Call the MCP handler
        const webResponse = await mcpHandler(webRequest);
        // Clean up API key
        setRequestApiKey(null);
        // Convert Web Response back to Vercel Response
        res.status(webResponse.status);
        // Copy headers
        webResponse.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });
        // Send body
        const body = await webResponse.text();
        res.send(body);
    }
    catch (error) {
        setRequestApiKey(null);
        console.error('Handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=mcp.js.map