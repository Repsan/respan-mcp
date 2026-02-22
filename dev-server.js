// Simple local HTTP server for testing the MCP HTTP handler
import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerLogTools } from './dist/lib/observe/logs.js';
import { registerTraceTools } from './dist/lib/observe/traces.js';
import { registerUserTools } from './dist/lib/observe/users.js';
import { registerPromptTools } from './dist/lib/develop/prompts.js';

const DEFAULT_BASE_URL = 'https://api.keywordsai.co/api';
const PORT = 3001;

function createServer(auth) {
  const server = new McpServer({ name: 'keywords-ai', version: '1.0.0' });
  registerLogTools(server, auth);
  registerTraceTools(server, auth);
  registerUserTools(server, auth);
  registerPromptTools(server, auth);
  return server;
}

async function handleAuth(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = {}; }

  const { action, email, password, refresh } = parsed;

  if (!action || (action !== 'login' && action !== 'refresh')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid action. Use "login" or "refresh".' }));
  }

  const baseUrl = req.headers['keywords-api-base-url'] || process.env.KEYWORDS_API_BASE_URL || DEFAULT_BASE_URL;
  const origin = baseUrl.replace(/\/api\/?$/, '');

  let backendUrl, reqBody;

  if (action === 'login') {
    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'email and password are required for login.' }));
    }
    backendUrl = `${origin}/auth/jwt/create/`;
    reqBody = { email, password };
  } else {
    if (!refresh) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'refresh token is required for refresh.' }));
    }
    backendUrl = `${origin}/auth/jwt/refresh/`;
    reqBody = { refresh };
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    const data = await response.json();
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Auth proxy error:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to reach authentication backend.' }));
  }
}

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Route: /auth
  if (url.pathname === '/auth') {
    return handleAuth(req, res);
  }

  // Route: / (MCP handler)
  // Only accept POST
  if (req.method === 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Use POST' }, id: null }));
  }
  if (req.method === 'DELETE') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'No session management in stateless mode' }, id: null }));
  }

  // Parse body
  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = body; }

  // Extract auth from header
  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : process.env.KEYWORDS_API_KEY;

  if (!apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized: send Authorization: Bearer YOUR_KEY' }, id: null }));
  }

  const baseUrl = req.headers['keywords-api-base-url'] || process.env.KEYWORDS_API_BASE_URL || DEFAULT_BASE_URL;
  const auth = { apiKey, baseUrl };

  try {
    const server = createServer(auth);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, parsed);
  } catch (error) {
    console.error('MCP Handler error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`MCP dev server running at http://localhost:${PORT}/`);
  console.log('  POST /      - MCP handler (Authorization: Bearer YOUR_KEY)');
  console.log('  POST /auth  - JWT login/refresh');
});
