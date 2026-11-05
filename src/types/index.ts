import type { File } from '@babel/types';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  recommendation: string;
  filePath: string;
  line?: number;
  column?: number;
}

export interface Rule {
  id: string;
  description: string;
  execute(ast: File, filePath: string): Finding[];
}

export interface ScanError {
  filePath: string;
  message: string;
}

export interface ScanResult {
  rootPath: string;
  filesScanned: number;
  findings: Finding[];
  errors: ScanError[];
}
