import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerLogTools } from './dist/lib/observe/logs.js';
import { registerTraceTools } from './dist/lib/observe/traces.js';
import { registerUserTools } from './dist/lib/observe/users.js';
import { registerPromptTools } from './dist/lib/develop/prompts.js';

const DEFAULT_BASE_URL = 'https://api.respan.ai/api';

function createServer(auth) {
  const server = new McpServer({ name: 'respan', version: '1.0.0' });
  registerLogTools(server, auth);
  registerTraceTools(server, auth);
  registerUserTools(server, auth);
  registerPromptTools(server, auth);
  return server;
}

const httpServer = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    req.body = body ? JSON.parse(body) : undefined;

    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET' || req.method === 'DELETE') {
      return res.status(405).json({ error: 'Only POST supported' });
    }

    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const baseUrl = req.headers['respan-api-base-url'] || DEFAULT_BASE_URL;
    console.log(`[LOCAL] respan-api-base-url header: ${req.headers['respan-api-base-url'] || '(not present)'}`);
    console.log(`[LOCAL] Resolved baseUrl: ${baseUrl}`);

    const auth = { apiKey, baseUrl };
    const server = createServer(auth);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
});

httpServer.listen(3456, () => console.log('Local MCP server on http://localhost:3456'));
