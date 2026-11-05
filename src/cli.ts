#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { transformUnverifiedJwt } from './codemods/index.js';
import { scanDirectory } from './scanner.js';
import type { Finding, ScanResult, Severity } from './types/index.js';

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const severityWeights: Record<Severity, number> = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 1,
};

interface Report {
  rootPath: string;
  filesScanned: number;
  findingCount: number;
  debtScore: number;
  severityCounts: Record<Severity, number>;
  findings: Finding[];
  errors: ScanResult['errors'];
  fixesApplied?: number;
}

function makeReport(result: ScanResult, fixesApplied?: number): Report {
  const severityCounts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const finding of result.findings) {
    severityCounts[finding.severity] += 1;
  }

  return {
    rootPath: result.rootPath,
    filesScanned: result.filesScanned,
    findingCount: result.findings.length,
    debtScore: result.findings.reduce(
      (score, finding) => score + severityWeights[finding.severity],
      0,
    ),
    severityCounts,
    findings: result.findings.map((finding) => ({
      ...finding,
      filePath: path.relative(result.rootPath, finding.filePath) || '.',
    })),
    errors: result.errors.map((error) => ({
      ...error,
      filePath: path.relative(result.rootPath, error.filePath) || '.',
    })),
    ...(fixesApplied === undefined ? {} : { fixesApplied }),
  };
}

function sortedFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (left, right) =>
      left.filePath.localeCompare(right.filePath) ||
      severityOrder[left.severity] - severityOrder[right.severity] ||
      (left.line ?? 0) - (right.line ?? 0) ||
      (left.column ?? 0) - (right.column ?? 0),
  );
}

function formatHumanReport(report: Report): string {
  const lines = [
    `Scanned ${report.filesScanned} source file(s); found ${report.findingCount} finding(s).`,
    `Debt score: ${report.debtScore} (critical ${report.severityCounts.critical}, high ${report.severityCounts.high}, medium ${report.severityCounts.medium}, low ${report.severityCounts.low})`,
  ];

  if (report.fixesApplied !== undefined) {
    lines.push(`Applied ${report.fixesApplied} JWT codemod fix(es).`);
  }

  const findings = sortedFindings(report.findings);
  if (findings.length > 0) {
    lines.push('', 'Findings:');
    let activeFile = '';

    for (const finding of findings) {
      if (finding.filePath !== activeFile) {
        activeFile = finding.filePath;
        lines.push(`  ${activeFile}`);
      }

      const location =
        finding.line === undefined
          ? ''
          : `:${finding.line}:${(finding.column ?? 0) + 1}`;
      lines.push(
        `    [${finding.severity.toUpperCase()}]${location} ${finding.message}`,
        `      Rule: ${finding.ruleId}. ${finding.recommendation}`,
      );
    }
  } else {
    lines.push('', 'No authentication debt findings.');
  }

  if (report.errors.length > 0) {
    lines.push('', 'Errors:');
    for (const error of report.errors) {
      lines.push(`  ${error.filePath}: ${error.message}`);
    }
  }

  return lines.join('\n');
}

function escapeMarkdown(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function formatMarkdownReport(report: Report): string {
  const lines = [
    '# Auth Sweep Scan Report',
    '',
    `- **Root:** \`${report.rootPath}\``,
    `- **Files scanned:** ${report.filesScanned}`,
    `- **Findings:** ${report.findingCount}`,
    `- **Debt score:** ${report.debtScore}`,
  ];

  if (report.fixesApplied !== undefined) {
    lines.push(`- **JWT fixes applied:** ${report.fixesApplied}`);
  }

  lines.push(
    '',
    '## Severity Summary',
    '',
    '| Critical | High | Medium | Low |',
    '| ---: | ---: | ---: | ---: |',
    `| ${report.severityCounts.critical} | ${report.severityCounts.high} | ${report.severityCounts.medium} | ${report.severityCounts.low} |`,
    '',
    '## Findings',
    '',
    '| File | Severity | Location | Rule | Finding | Recommendation |',
    '| --- | --- | --- | --- | --- | --- |',
  );

  for (const finding of sortedFindings(report.findings)) {
    const location =
      finding.line === undefined
        ? ''
        : `${finding.line}:${(finding.column ?? 0) + 1}`;
    lines.push(
      `| ${escapeMarkdown(finding.filePath)} | ${finding.severity.toUpperCase()} | ${location} | ${escapeMarkdown(finding.ruleId)} | ${escapeMarkdown(finding.message)} | ${escapeMarkdown(finding.recommendation)} |`,
    );
  }

  if (report.findings.length === 0) {
    lines.push('| — | — | — | — | No findings | — |');
  }

  if (report.errors.length > 0) {
    lines.push('', '## Scan Errors', '');
    for (const error of report.errors) {
      lines.push(`- \`${error.filePath}\`: ${error.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function usage(): string {
  return [
    'Usage: auth-sweep scan <dir> [--json] [--fix] [--out <file>]',
    '',
    'Options:',
    '  --json       Print the structured JSON report',
    '  --fix        Rewrite jwt.decode(token) calls to jwt.verify(token, process.env.JWT_SECRET)',
    '  --out <file> Write a JSON or Markdown report (.json / .md)',
    '  -h, --help   Show this help',
  ].join('\n');
}

function applyJwtFixes(result: ScanResult): number {
  const files = new Set(
    result.findings
      .filter((finding) => finding.ruleId === 'unverified-jwt')
      .map((finding) => finding.filePath),
  );
  let changes = 0;

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const transformed = transformUnverifiedJwt(source, filePath);

    if (transformed.changes > 0) {
      fs.writeFileSync(filePath, transformed.code, 'utf8');
      changes += transformed.changes;
    }
  }

  return changes;
}

function writeReport(report: Report, outputPath: string): void {
  const extension = path.extname(outputPath).toLowerCase();
  let content: string;

  if (extension === '.md' || extension === '.markdown') {
    content = formatMarkdownReport(report);
  } else if (extension === '.json') {
    content = `${JSON.stringify(report, null, 2)}\n`;
  } else {
    throw new TypeError('Report output must use a .json or .md extension.');
  }

  fs.writeFileSync(outputPath, content, 'utf8');
}

function main(args: string[]): number {
  const { values, positionals } = parseArgs({
    args,
    options: {
      fix: { type: 'boolean' },
      json: { type: 'boolean' },
      out: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(usage());
    return 0;
  }

  if (positionals.length !== 2 || positionals[0] !== 'scan') {
    console.error(usage());
    return 2;
  }

  let result = scanDirectory(positionals[1]!);
  let fixesApplied: number | undefined;

  if (values.fix) {
    fixesApplied = applyJwtFixes(result);
    if (fixesApplied > 0) {
      result = scanDirectory(positionals[1]!);
    }
  }

  const report = makeReport(result, fixesApplied);
  const output = values.json ? JSON.stringify(report, null, 2) : formatHumanReport(report);
  console.log(output);

  if (values.out) {
    writeReport(report, values.out);
    console.error(`Report written to ${path.resolve(values.out)}`);
  }

  return result.errors.length > 0 ? 1 : 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`auth-sweep: ${message}`);
    process.exitCode = 1;
  }
}
