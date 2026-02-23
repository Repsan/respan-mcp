import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerLogTools } from '../observe/logs.js';
import { registerPromptTools } from '../develop/prompts.js';
import { registerTraceTools } from '../observe/traces.js';
import { registerUserTools } from '../observe/users.js';
import type { AuthConfig } from './client.js';

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

export function createMcpHandler(defaultBaseUrl: string, resourceMetadataUrl: string) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

    if (req.method === 'GET') {
      return res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'SSE streams not supported in stateless mode. Use POST for tool calls.' },
        id: null,
      });
    }
    if (req.method === 'DELETE') {
      return res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session management not supported in stateless mode.' },
        id: null,
      });
    }

    try {
      const apiKey = extractApiKey(req);

      if (!apiKey) {
        res.setHeader(
          'WWW-Authenticate',
          `Bearer resource_metadata="${resourceMetadataUrl}"`
        );
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Unauthorized: API key required. Use Authorization: Bearer YOUR_KEY header or set KEYWORDS_API_KEY environment variable.',
          },
          id: null,
        });
      }

      const baseUrl = (req.headers['keywords-api-base-url'] as string)
        || process.env.KEYWORDS_API_BASE_URL
        || defaultBaseUrl;

      const auth: AuthConfig = {
        apiKey,
        baseUrl,
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
  };
}
