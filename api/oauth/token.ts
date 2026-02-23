import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { verifyAuthCode } from '../../lib/shared/oauth.js';

function parseBody(req: VercelRequest): Record<string, string> {
  const contentType = req.headers['content-type'] || '';

  // Handle application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    if (typeof req.body === 'string') {
      const params: Record<string, string> = {};
      for (const [k, v] of new URLSearchParams(req.body)) {
        params[k] = v;
      }
      return params;
    }
    // Vercel may have already parsed it as an object
    return req.body || {};
  }

  // Handle JSON
  return req.body || {};
}

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
    const params = parseBody(req);
    const { grant_type, code, code_verifier, client_id, redirect_uri } = params;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!code || !code_verifier || !client_id || !redirect_uri) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
    }

    // Decrypt and verify the auth code
    let authCode;
    try {
      authCode = verifyAuthCode(code);
    } catch {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    }

    // Verify PKCE: base64url(SHA256(code_verifier)) === code_challenge
    const expectedChallenge = createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    if (expectedChallenge !== authCode.codeChallenge) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
    }

    // Verify client_id matches
    if (client_id !== authCode.clientId) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'client_id mismatch' });
    }

    // Verify redirect_uri matches
    if (redirect_uri !== authCode.redirectUri) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    }

    // Return the JWT as the access token — works directly with existing Bearer token handling
    return res.status(200).json({
      access_token: authCode.jwt,
      token_type: 'bearer',
      expires_in: 3600,
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
