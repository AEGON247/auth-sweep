export function authenticate(req, res, next) {
  const authorization = req.headers['authorization'];
  if (!authorization || !authorization.startsWith('Basic ')) {
    return res.status(401).end();
  }

  const credentials = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  const [username, password] = credentials.split(':');
  req.legacyIdentity = { username, password };
  return next();
}
