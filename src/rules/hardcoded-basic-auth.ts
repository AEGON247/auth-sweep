import type { Finding, Rule } from '../types/index.js';
import { traverseAst } from '../ast.js';
import { createFinding, isMemberExpressionNamed } from './helpers.js';

export const hardcodedBasicAuthRule: Rule = {
  id: 'hardcoded-basic-auth',
  description: 'Detects Basic authentication assembly and base64 credential decoding.',
  execute(ast, filePath) {
    const findings: Finding[] = [];

    traverseAst(ast, {
      CallExpression(path) {
        const { node } = path;
        const encoding = node.arguments[1];

        if (
          isMemberExpressionNamed(node.callee, 'Buffer', 'from') &&
          encoding?.type === 'StringLiteral' &&
          encoding.value.toLowerCase() === 'base64'
        ) {
          findings.push(
            createFinding(
              node,
              filePath,
              'hardcoded-basic-auth',
              'high',
              'Base64 data is decoded with Buffer.from(); this may expose manually handled Basic credentials.',
              'Avoid manually decoding Basic credentials; delegate authentication to a vetted middleware or identity provider.',
            ),
          );
        }
      },

      StringLiteral(path) {
        if (!/^basic\s/i.test(path.node.value)) {
          return;
        }

        findings.push(
          createFinding(
            path.node,
            filePath,
            'hardcoded-basic-auth',
            'medium',
            'A Basic authentication header prefix is assembled in application code.',
            'Avoid assembling Basic authentication headers manually; use a maintained authentication client or middleware.',
          ),
        );
      },
    });

    return findings;
  },
};
