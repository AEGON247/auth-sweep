import traverseImport from '@babel/traverse';
import type { NodePath, Scope, TraverseOptions } from '@babel/traverse';
import type { Node } from '@babel/types';

type BabelTraverse = (
  parent: Node,
  options?: TraverseOptions,
  scope?: Scope,
  state?: unknown,
  parentPath?: NodePath,
) => void;

const traverseModule = traverseImport as unknown as BabelTraverse & {
  default?: BabelTraverse;
};
const babelTraverse: BabelTraverse = traverseModule.default ?? traverseModule;

export function traverseAst(ast: Node, visitor: TraverseOptions): void {
  babelTraverse(ast, visitor);
}
