import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'node:crypto';
import { createClientRegistration } from '../../lib/shared/oauth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Protocol-Version');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { redirect_uris, client_name } = req.body || {};

    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return res.status(400).json({ error: 'redirect_uris is required and must be a non-empty array' });
    }

    for (const uri of redirect_uris) {
      if (typeof uri !== 'string') {
        return res.status(400).json({ error: 'Each redirect_uri must be a string' });
      }
    }

    const clientId = randomBytes(16).toString('hex');
    const token = createClientRegistration(clientId, redirect_uris);

    return res.status(201).json({
      client_id: `enc_${token}`,
      client_name: client_name || '',
      redirect_uris,
      token_endpoint_auth_method: 'none',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
