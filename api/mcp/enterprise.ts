import { createMcpHandler } from '../../lib/shared/mcp-handler.js';

export default createMcpHandler(
  'https://endpoint.respan.ai/api',
  'https://mcp.keywordsai.co/.well-known/oauth-protected-resource/enterprise'
);
