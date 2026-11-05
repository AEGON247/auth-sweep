// BAD PATTERN 1: Insecure JWT decode (no signature verification)
import jwt from 'jsonwebtoken';

function handleRequest(req) {
  const token = req.headers['authorization'];
  // Unverified decode!
  const user = jwt.decode(token); 
  return user;
}

// BAD PATTERN 2: Manual Basic Auth parsing
function authenticate(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
    // Legacy Basic Auth detected
  }
}