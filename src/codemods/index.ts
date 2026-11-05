import { generate } from '@babel/generator';
import * as parser from '@babel/parser';
import * as types from '@babel/types';
import { traverseAst } from '../ast.js';
import { getPropertyName } from '../rules/helpers.js';

export interface CodemodResult {
  code: string;
  changes: number;
}

function isJwtDecodeCall(
  node: types.Node,
): node is types.CallExpression & { callee: types.MemberExpression } {
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
    return false;
  }

  return (
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'jwt' &&
    getPropertyName(node.callee.property) === 'decode'
  );
}

export function transformUnverifiedJwt(
  source: string,
  filename?: string,
): CodemodResult {
  const ast = parser.parse(source, {
    sourceType: 'unambiguous',
    ...(filename ? { sourceFilename: filename } : {}),
    plugins: ['jsx', 'typescript'],
  });
  let changes = 0;

  traverseAst(ast, {
    CallExpression(path) {
      if (!isJwtDecodeCall(path.node) || path.node.arguments.length !== 1) {
        return;
      }

      path.node.callee.property = types.identifier('verify');
      path.node.arguments.push(
        types.memberExpression(
          types.memberExpression(types.identifier('process'), types.identifier('env')),
          types.identifier('JWT_SECRET'),
        ),
      );
      changes += 1;
    },
  });

  return {
    code: changes === 0 ? source : generate(ast, { comments: true }).code,
    changes,
  };
}
