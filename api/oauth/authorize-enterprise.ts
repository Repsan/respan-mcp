import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyClientRegistration } from '../../lib/shared/oauth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'MCP-Protocol-Version');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = req.query as Record<string, string>;

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Unsupported response_type. Must be "code".' });
  }

  if (!client_id || !redirect_uri || !code_challenge || !state) {
    return res.status(400).json({ error: 'Missing required parameters: client_id, redirect_uri, code_challenge, state' });
  }

  if (code_challenge_method && code_challenge_method !== 'S256') {
    return res.status(400).json({ error: 'Unsupported code_challenge_method. Must be "S256".' });
  }

  if (!client_id.startsWith('enc_')) {
    return res.status(400).json({ error: 'Invalid client_id' });
  }

  try {
    const registration = verifyClientRegistration(client_id.slice(4));
    if (!registration.redirectUris.includes(redirect_uri)) {
      return res.status(400).json({ error: 'redirect_uri does not match registered URIs' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid or expired client_id' });
  }

  const loginParams = new URLSearchParams({
    mode: 'oauth',
    enterprise: 'true',
    client_id,
    redirect_uri,
    code_challenge,
    state,
  });

  return res.redirect(302, `/login?${loginParams.toString()}`);
}
