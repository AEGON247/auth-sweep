import type { Finding, Rule } from '../types/index.js';
import { traverseAst } from '../ast.js';
import { createFinding, isMemberExpressionNamed } from './helpers.js';

export const unverifiedJwtRule: Rule = {
  id: 'unverified-jwt',
  description: 'Detects jwt.decode() calls that do not verify a token signature.',
  execute(ast, filePath) {
    const findings: Finding[] = [];

    traverseAst(ast, {
      CallExpression(path) {
        if (isMemberExpressionNamed(path.node.callee, 'jwt', 'decode')) {
          findings.push(
            createFinding(
              path.node,
              filePath,
              'unverified-jwt',
              'high',
              'JWT is decoded without verifying its signature.',
              'Replace jwt.decode() with jwt.verify() using a trusted verification key.',
            ),
          );
        }
      },
    });

    return findings;
  },
};
