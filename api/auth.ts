import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_BASE_URL = 'https://api.keywordsai.co/api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { action, email, password, refresh } = req.body ?? {};

  if (!action || (action !== 'login' && action !== 'refresh')) {
    return res.status(400).json({ error: 'Invalid action. Use "login" or "refresh".' });
  }

  const baseUrl = (req.headers['keywords-api-base-url'] as string)
    || process.env.KEYWORDS_API_BASE_URL
    || DEFAULT_BASE_URL;

  // Strip trailing /api if present so we can build the auth URL correctly.
  // The JWT endpoints live at /auth/jwt/... which is outside the /api/ prefix.
  const origin = baseUrl.replace(/\/api\/?$/, '');

  let backendUrl: string;
  let body: Record<string, string>;

  if (action === 'login') {
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required for login.' });
    }
    backendUrl = `${origin}/auth/jwt/create/`;
    body = { email, password };
  } else {
    if (!refresh) {
      return res.status(400).json({ error: 'refresh token is required for refresh.' });
    }
    backendUrl = `${origin}/auth/jwt/refresh/`;
    body = { refresh };
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Auth proxy error:', error);
    return res.status(502).json({ error: 'Failed to reach authentication backend.' });
  }
}
