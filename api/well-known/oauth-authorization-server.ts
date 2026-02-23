import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'MCP-Protocol-Version');

  if (_req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return res.status(200).json({
    issuer: 'https://mcp.keywordsai.co',
    authorization_endpoint: 'https://mcp.keywordsai.co/authorize',
    token_endpoint: 'https://mcp.keywordsai.co/token',
    registration_endpoint: 'https://mcp.keywordsai.co/register',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
}
