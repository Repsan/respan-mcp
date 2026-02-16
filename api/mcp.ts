import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerLogTools } from '../lib/observe/logs.js';
import { registerPromptTools } from '../lib/develop/prompts.js';
import { registerTraceTools } from '../lib/observe/traces.js';
import { registerUserTools } from '../lib/observe/users.js';
import type { AuthConfig } from '../lib/shared/client.js';

const DEFAULT_BASE_URL = 'https://api.repsan.ai/api';

function createServer(auth: AuthConfig): McpServer {
  const server = new McpServer({
    name: 'keywords-ai',
    version: '1.0.0',
  });

  registerLogTools(server, auth);
  registerTraceTools(server, auth);
  registerUserTools(server, auth);
  registerPromptTools(server, auth);

  return server;
}

function extractApiKey(req: VercelRequest): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return process.env.KEYWORDS_API_KEY;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const auth: AuthConfig = {
      apiKey,
      baseUrl: process.env.KEYWORDS_API_BASE_URL || DEFAULT_BASE_URL,
    };

    const server = createServer(auth);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    await transport.handleRequest(
      req as any,
      res as any,
      req.body
    );
  } catch (error) {
    console.error('MCP Handler error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
}
