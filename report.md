# Auth Sweep Scan Report

- **Root:** `C:\dev\auth-sweep\test-fixtures\legacy-enterprise-app`
- **Files scanned:** 3
- **Findings:** 7
- **Debt score:** 37

## Severity Summary

| Critical | High | Medium | Low |
| ---: | ---: | ---: | ---: |
| 0 | 3 | 4 | 0 |

## Findings

| File | Severity | Location | Rule | Finding | Recommendation |
| --- | --- | --- | --- | --- | --- |
| src\auth\access-token.ts | HIGH | 5:10 | unverified-jwt | JWT is decoded without verifying its signature. | Replace jwt.decode() with jwt.verify() using a trusted verification key. |
| src\auth\access-token.ts | MEDIUM | 4:20 | manual-auth-header | Authorization header is accessed directly and may be parsed inconsistently. | Use centralized authentication middleware that validates credentials consistently. |
| src\middleware\legacy-basic-auth.js | HIGH | 7:23 | hardcoded-basic-auth | Base64 data is decoded with Buffer.from(); this may expose manually handled Basic credentials. | Avoid manually decoding Basic credentials; delegate authentication to a vetted middleware or identity provider. |
| src\middleware\legacy-basic-auth.js | MEDIUM | 2:25 | manual-auth-header | Authorization header is accessed directly and may be parsed inconsistently. | Use centralized authentication middleware that validates credentials consistently. |
| src\middleware\legacy-basic-auth.js | MEDIUM | 3:51 | hardcoded-basic-auth | A Basic authentication header prefix is assembled in application code. | Avoid assembling Basic authentication headers manually; use a maintained authentication client or middleware. |
| src\server\session-config.cjs | HIGH | 4:30 | insecure-session-cookie | Session cookie configuration is insecure: secure is explicitly disabled and httpOnly is not explicitly enabled. | Set secure: true for HTTPS deployments and explicitly set httpOnly: true. |
| src\server\session-config.cjs | MEDIUM | 14:36 | insecure-session-cookie | Session cookie configuration is insecure: httpOnly is not explicitly enabled. | Set secure: true for HTTPS deployments and explicitly set httpOnly: true. |
