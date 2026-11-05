import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as types from '@babel/types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Normalize ESM/CJS default export mismatch across TS module resolutions
const traverse = (_traverse as any).default || _traverse;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../test-fixtures/legacy-code.js');
const code = fs.readFileSync(filePath, 'utf-8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

console.log('🔍 Scanning code for legacy auth patterns...\n');

traverse(ast, {
  CallExpression(nodePath: NodePath<types.CallExpression>) {
    const { callee } = nodePath.node;

    if (
      callee.type === 'MemberExpression' &&
      callee.object.type === 'Identifier' &&
      callee.object.name === 'jwt' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'decode'
    ) {
      const loc = nodePath.node.loc;
      console.log(`🚨 [HIGH RISK] Unverified JWT Decode Found!`);
      console.log(`   Location: Line ${loc?.start.line}, Column ${loc?.start.column}`);
      console.log(`   Recommendation: Replace 'jwt.decode()' with 'jwt.verify()'.\n`);
    }
  },

  MemberExpression(nodePath: NodePath<types.MemberExpression>) {
    const { object, property } = nodePath.node;

    const isHeadersObject =
      object.type === 'MemberExpression' &&
      object.property.type === 'Identifier' &&
      object.property.name === 'headers';

    const isAuthProperty =
      (property.type === 'Identifier' && property.name === 'authorization') ||
      (property.type === 'StringLiteral' && property.value === 'authorization');

    if (isHeadersObject && isAuthProperty) {
      const loc = nodePath.node.loc;
      console.log(`⚠️  [MEDIUM RISK] Manual Authorization Header Parsing Detected!`);
      console.log(`   Location: Line ${loc?.start.line}, Column ${loc?.start.column}`);
      console.log(`   Recommendation: Use central authentication middleware.\n`);
    }
  },
});