import { createMcpHandler } from '../lib/shared/mcp-handler.js';

export default createMcpHandler(
  'https://api.keywordsai.co/api',
  'https://mcp.keywordsai.co/.well-known/oauth-protected-resource'
);
