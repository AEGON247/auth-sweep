import jwt from 'jsonwebtoken';

export function loadIdentity(req: { headers: Record<string, string | undefined> }) {
  const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  return jwt.decode(rawToken ?? '');
}
