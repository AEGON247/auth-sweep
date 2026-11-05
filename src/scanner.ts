import * as fs from 'node:fs';
import * as path from 'node:path';
import * as parser from '@babel/parser';
import type { Finding, ScanError, ScanResult } from './types/index.js';
import { rules } from './rules/index.js';

const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
]);
const sourceExtensions = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
]);

function collectSourceFiles(directory: string, files: string[]): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        collectSourceFiles(entryPath, files);
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function scanDirectory(directory: string): ScanResult {
  const rootPath = path.resolve(directory);
  const rootStats = fs.statSync(rootPath);

  if (!rootStats.isDirectory()) {
    throw new TypeError(`Scan target is not a directory: ${rootPath}`);
  }

  const sourceFiles: string[] = [];
  collectSourceFiles(rootPath, sourceFiles);
  sourceFiles.sort();

  const findings: Finding[] = [];
  const errors: ScanError[] = [];

  for (const filePath of sourceFiles) {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      const ast = parser.parse(code, {
        sourceType: 'unambiguous',
        sourceFilename: filePath,
        plugins: ['jsx', 'typescript'],
      });

      for (const rule of rules) {
        findings.push(...rule.execute(ast, filePath));
      }
    } catch (error) {
      errors.push({ filePath, message: errorMessage(error) });
    }
  }

  return {
    rootPath,
    filesScanned: sourceFiles.length,
    findings,
    errors,
  };
}
