// api/mcp.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLogTools } from "../lib/observe/logs.js";
import { registerTraceTools } from "../lib/observe/traces.js";
import { registerUserTools } from "../lib/observe/users.js";
import { registerPromptTools } from "../lib/develop/prompts.js";
import { createMcpHandler } from "mcp-handler";
import { setRequestApiKey } from "../lib/shared/client.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Create the base MCP handler (Web Fetch API)
const mcpHandler = createMcpHandler((server: McpServer) => {
  registerLogTools(server);
  registerTraceTools(server);
  registerUserTools(server);
  registerPromptTools(server);
});

// Convert Vercel Request to Web Request
function toWebRequest(req: VercelRequest): Request {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'] || 'localhost';
  const url = `${protocol}://${host}${req.url}`;
  
  // Convert body to string if it exists
  let bodyString: string | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }
  
  return new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: bodyString,
  });
}

// Export Vercel-compatible handler that extracts API key from query parameter
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract API key from query parameter and store it
    const apiKey = req.query.apikey as string | undefined;
    
    if (apiKey) {
      setRequestApiKey(apiKey);
    }
    
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
    
  } catch (error) {
    setRequestApiKey(null);
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}