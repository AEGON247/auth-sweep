import type { Node, Expression, PrivateName } from '@babel/types';
import type { Finding, Severity } from '../types/index.js';

export function getPropertyName(property: Expression | PrivateName): string | undefined {
  if (property.type === 'Identifier' || property.type === 'StringLiteral') {
    return property.type === 'Identifier' ? property.name : property.value;
  }

  return undefined;
}

export function isMemberExpressionNamed(
  node: Node,
  objectName: string,
  propertyName: string,
): boolean {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === objectName &&
    getPropertyName(node.property) === propertyName
  );
}

export function createFinding(
  node: Node,
  filePath: string,
  ruleId: string,
  severity: Severity,
  message: string,
  recommendation: string,
): Finding {
  const location = node.loc?.start;

  return {
    ruleId,
    severity,
    message,
    recommendation,
    filePath,
    ...(location
      ? {
          line: location.line,
          column: location.column,
        }
      : {}),
  };
}
