import type { Rule } from '../types/index.js';
import { hardcodedBasicAuthRule } from './hardcoded-basic-auth.js';
import { insecureSessionCookieRule } from './insecure-session-cookie.js';
import { manualAuthHeaderRule } from './manual-auth-header.js';
import { unverifiedJwtRule } from './unverified-jwt.js';

export const rules: readonly Rule[] = [
  unverifiedJwtRule,
  manualAuthHeaderRule,
  hardcodedBasicAuthRule,
  insecureSessionCookieRule,
];

export {
  hardcodedBasicAuthRule,
  insecureSessionCookieRule,
  manualAuthHeaderRule,
  unverifiedJwtRule,
};
