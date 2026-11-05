# auth-sweep

`auth-sweep` is a TypeScript command-line scanner for locating legacy authentication patterns in JavaScript and TypeScript repositories. It parses source into Babel ASTs, applies focused rules, reports findings with source locations, and can automatically migrate the supported JWT decode pattern.

## Architecture

```text
 Source files
     |
     v
 AST Parsing (@babel/parser)
     |
     v
 Rule Visitor (JWT, headers, Basic Auth, session cookies)
     |
     v
 Finding Collector (severity, rule, file, AST location)
     |
     +-----------------------> JSON / terminal / Markdown report
     |
     v
 Codemod Engine (--fix: jwt.decode -> jwt.verify)
```

The scanner recursively reads JavaScript and TypeScript source while excluding `node_modules`, `.git`, `dist`, `build`, and `.next`. Rules share one execution contract and emit structured findings; parse and read failures are reported separately instead of being silently discarded.

## Installation and usage

Requires Node.js 20 or newer.

```sh
npm install
npm run build
```

Use the local CLI:

```sh
node dist/cli.js scan ./path/to/project
```

Or link the package to install the `auth-sweep` executable:

```sh
npm link
auth-sweep scan ./path/to/project
```

Supported options:

```sh
auth-sweep scan ./src --json
auth-sweep scan ./src --out report.md
auth-sweep scan ./src --out report.json
auth-sweep scan ./src --fix
```

`--json` prints a machine-readable report. `--out` writes a `.json` or `.md` report. The human-readable output groups findings by file and severity and includes line and column locations and a severity-weighted debt score. `--fix` rewrites supported one-argument `jwt.decode(token)` calls to `jwt.verify(token, process.env.JWT_SECRET)`, then rescans the directory. Review changes and configure `JWT_SECRET` securely before deploying a migration.

The representative legacy patterns are under [`test-fixtures/legacy-enterprise-app`](./test-fixtures/legacy-enterprise-app/).

## Detection coverage

| Rule | Detection |
| --- | --- |
| `unverified-jwt` | `jwt.decode()` calls, which do not verify a token signature |
| `manual-auth-header` | Direct `req.headers.authorization` access |
| `hardcoded-basic-auth` | Base64 decoding via `Buffer.from(..., 'base64')` and Basic header prefix literals |
| `insecure-session-cookie` | `express-session` or `cookie-session` options with `secure: false` or without explicit `httpOnly: true` |

## Architectural Decisions & Threat Model: Legacy Auth Migration at Scale

**Design decisions**

- **AST-based inspection:** Babel parsing and visitor-based rules recognize syntax rather than relying solely on text matching. The common `Rule` contract allows findings to be added and rendered consistently.
- **Incremental remediation:** Findings include rule IDs and source locations so teams can prioritize and review work. The codemod is deliberately narrow; `--fix` changes only supported `jwt.decode(token)` calls and leaves all other findings for engineering review.
- **Explicit operational failures:** Unreadable or unparsable files are included in scan errors, and a scan with errors exits unsuccessfully so automation can detect incomplete coverage.
- **No runtime execution:** Target files are parsed, not loaded or executed. The scanner does not need application credentials or access to production systems.

**Threat model and limitations**

- The tool addresses migration debt patterns in source code; it is not a runtime enforcement mechanism, a complete authentication audit, or a replacement for code review and security testing.
- Static analysis can produce false positives and false negatives. Dynamically assembled APIs, aliases that cannot be resolved by a local rule, framework-specific wrappers, and generated code may not be recognized. Review findings in their application context.
- The JWT codemod selects `process.env.JWT_SECRET` as a migration placeholder. Teams must validate key management, algorithm policy, issuer/audience constraints, error handling, and deployment configuration before adopting the rewritten code.
- Cookie security depends on deployment topology. `secure: true` assumes HTTPS is correctly configured, including trusted proxy settings where applicable. Findings indicate configuration requiring review, not proof of exploitability.
- Scanning is limited to the supported JavaScript/TypeScript extensions and excludes common dependency and build-output directories. It does not inspect dependencies or infer runtime behavior.
- `--fix` modifies matching source files in place. Run it on a clean working tree or review the resulting diff before committing.

## Open Source & Security Projects

- Built **auth-sweep**, a modular TypeScript static-analysis engine using Babel AST parsing and rule visitors to identify legacy authentication patterns with precise file and source locations.
- Implemented an AST-based JWT codemod that rewrites supported `jwt.decode(token)` calls to `jwt.verify(token, process.env.JWT_SECRET)` and rescans the codebase after changes.
- Developed a structured authentication-debt scanner for unverified JWTs, manual authorization-header handling, Basic Auth credential decoding, and insecure session-cookie configuration, with terminal, JSON, and Markdown reporting.
