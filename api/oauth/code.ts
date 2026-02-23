import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyClientRegistration, createAuthCode } from '../../lib/shared/oauth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jwt, client_id, redirect_uri, code_challenge, state } = req.body || {};

    if (!jwt || !client_id || !redirect_uri || !code_challenge || !state) {
      return res.status(400).json({ error: 'Missing required fields: jwt, client_id, redirect_uri, code_challenge, state' });
    }

    // Validate client_id
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

    const code = createAuthCode(jwt, code_challenge, redirect_uri, client_id);

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);

    return res.status(200).json({ redirect_url: callbackUrl.toString() });
  } catch (err) {
    console.error('Code generation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
