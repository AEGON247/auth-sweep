const session = require('express-session');
const cookieSession = require('cookie-session');

export const legacySession = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: false,
  },
});

export const legacyCookieSession = cookieSession({
  name: 'legacy-session',
  keys: [process.env.SESSION_KEY],
  secure: true,
});
