import type { Finding, Rule } from '../types/index.js';
import { traverseAst } from '../ast.js';
import { createFinding, getPropertyName } from './helpers.js';

export const manualAuthHeaderRule: Rule = {
  id: 'manual-auth-header',
  description: 'Detects direct parsing of req.headers.authorization.',
  execute(ast, filePath) {
    const findings: Finding[] = [];

    traverseAst(ast, {
      MemberExpression(path) {
        const { node } = path;
        const headers = node.object;

        if (
          getPropertyName(node.property) !== 'authorization' ||
          headers.type !== 'MemberExpression' ||
          getPropertyName(headers.property) !== 'headers' ||
          headers.object.type !== 'Identifier' ||
          headers.object.name !== 'req'
        ) {
          return;
        }

        findings.push(
          createFinding(
            node,
            filePath,
            'manual-auth-header',
            'medium',
            'Authorization header is accessed directly and may be parsed inconsistently.',
            'Use centralized authentication middleware that validates credentials consistently.',
          ),
        );
      },
    });

    return findings;
  },
};
