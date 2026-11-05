import type {
  CallExpression,
  Expression,
  File,
  ObjectExpression,
  ObjectProperty,
} from '@babel/types';
import type { Finding, Rule } from '../types/index.js';
import { traverseAst } from '../ast.js';
import { createFinding, getPropertyName } from './helpers.js';

type SessionPackage = 'express-session' | 'cookie-session';

function packageNameFromRequire(node: Expression): SessionPackage | undefined {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'Identifier' ||
    node.callee.name !== 'require'
  ) {
    return undefined;
  }

  const moduleName = node.arguments[0];
  if (moduleName?.type !== 'StringLiteral') {
    return undefined;
  }

  return moduleName.value === 'express-session' || moduleName.value === 'cookie-session'
    ? moduleName.value
    : undefined;
}

function collectSessionBindings(ast: File): Map<string, SessionPackage> {
  const bindings = new Map<string, SessionPackage>();

  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') {
      const source = statement.source.value;
      if (source !== 'express-session' && source !== 'cookie-session') {
        continue;
      }

      for (const specifier of statement.specifiers) {
        bindings.set(specifier.local.name, source);
      }
    }

    if (statement.type !== 'VariableDeclaration') {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (declaration.id.type !== 'Identifier' || !declaration.init) {
        continue;
      }

      const source = packageNameFromRequire(declaration.init);
      if (source) {
        bindings.set(declaration.id.name, source);
      }
    }
  }

  return bindings;
}

function getProperty(
  object: ObjectExpression,
  name: string,
): ObjectProperty | undefined {
  return object.properties.find(
    (property): property is ObjectProperty =>
      property.type === 'ObjectProperty' && getPropertyName(property.key) === name,
  );
}

function isFalseProperty(property: ObjectProperty | undefined): boolean {
  return property?.value.type === 'BooleanLiteral' && !property.value.value;
}

function isTrueProperty(property: ObjectProperty | undefined): boolean {
  return property?.value.type === 'BooleanLiteral' && property.value.value;
}

function getOptionsObject(call: CallExpression): ObjectExpression | undefined {
  const options = call.arguments[0];
  return options?.type === 'ObjectExpression' ? options : undefined;
}

export const insecureSessionCookieRule: Rule = {
  id: 'insecure-session-cookie',
  description: 'Detects insecure express-session and cookie-session cookie configuration.',
  execute(ast, filePath) {
    const bindings = collectSessionBindings(ast);
    const findings: Finding[] = [];

    traverseAst(ast, {
      CallExpression(path) {
        const { node } = path;
        let sessionPackage: SessionPackage | undefined;

        if (node.callee.type === 'Identifier') {
          sessionPackage = bindings.get(node.callee.name);
        } else if (node.callee.type === 'CallExpression') {
          sessionPackage = packageNameFromRequire(node.callee);
        }

        if (!sessionPackage) {
          return;
        }

        const options = getOptionsObject(node);
        if (!options) {
          return;
        }

        const cookieOptionsProperty =
          sessionPackage === 'express-session' ? getProperty(options, 'cookie') : undefined;
        const cookieOptions =
          cookieOptionsProperty?.value.type === 'ObjectExpression'
            ? cookieOptionsProperty.value
            : sessionPackage === 'express-session'
              ? undefined
              : options;

        const secureProperty = cookieOptions ? getProperty(cookieOptions, 'secure') : undefined;
        const httpOnlyProperty = cookieOptions ? getProperty(cookieOptions, 'httpOnly') : undefined;
        const insecureTransport = isFalseProperty(secureProperty);
        const missingHttpOnly = !isTrueProperty(httpOnlyProperty);

        if (!insecureTransport && !missingHttpOnly) {
          return;
        }

        const concerns = [
          ...(insecureTransport ? ['secure is explicitly disabled'] : []),
          ...(missingHttpOnly ? ['httpOnly is not explicitly enabled'] : []),
        ];

        findings.push(
          createFinding(
            node,
            filePath,
            'insecure-session-cookie',
            insecureTransport ? 'high' : 'medium',
            `Session cookie configuration is insecure: ${concerns.join(' and ')}.`,
            'Set secure: true for HTTPS deployments and explicitly set httpOnly: true.',
          ),
        );
      },
    });

    return findings;
  },
};
