import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerLogTools } from '../lib/observe/logs.js';
import { registerPromptTools } from '../lib/develop/prompts.js';
import { registerTraceTools } from '../lib/observe/traces.js';
import { registerUserTools } from '../lib/observe/users.js';
import { setRequestApiKey, setRequestBaseUrl } from '../lib/shared/client.js';

// Create and configure MCP Server
function createServer(): McpServer {
  const server = new McpServer({
    name: 'keywords-ai-mcp',
    version: '1.0.0',
  });

  // Register all tools
  registerLogTools(server);
  registerPromptTools(server);
  registerTraceTools(server);
  registerUserTools(server);

  return server;
}

// Session storage for stateful connections
const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

// Extract API key from request
function extractApiKey(req: VercelRequest): string | undefined {
  // Method 1: Authorization header (standard, recommended)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Method 2: Environment variable (for private deployments)
  return process.env.KEYWORDS_API_KEY;
}

// Extract base URL override from request header
function extractBaseUrl(req: VercelRequest): string | undefined {
  // KEYWORDS_API_BASE_URL header for enterprise/custom endpoints
  const baseUrlHeader = req.headers['keywords-api-base-url'] as string | undefined;
  if (baseUrlHeader) {
    return baseUrlHeader;
  }
  
  // Fallback to environment variable
  return process.env.KEYWORDS_API_BASE_URL;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`=== MCP Request: ${req.method} ${req.url} ===`);
  console.log(`Body type: ${typeof req.body}, Body:`, JSON.stringify(req.body));

  try {
    // 1. Extract and validate API key
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized: API key required. Use Authorization: Bearer YOUR_KEY header or set KEYWORDS_API_KEY environment variable.',
        },
        id: null,
      });
    }

    // Set API key and base URL for this request context
    setRequestApiKey(apiKey);
    setRequestBaseUrl(extractBaseUrl(req));

    // 2. Get session ID from request header
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    let session = sessionId ? sessions.get(sessionId) : undefined;
    
    if (!session) {
      // Create new session with stateless transport (no session management)
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });
      
      // Connect server to transport
      await server.connect(transport);
      
      // For stateless, we don't store sessions
      session = { server, transport };
      
      console.log('Created stateless MCP session');
    }

    // 3. Handle the request using the transport
    // Pass pre-parsed body since Vercel already consumed the stream
    await session.transport.handleRequest(
      req as any,  // VercelRequest extends IncomingMessage
      res as any,  // VercelResponse extends ServerResponse
      req.body     // Vercel pre-parses JSON body
    );

  } catch (error) {
    console.error('MCP Handler error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      });
    }
  }
}
