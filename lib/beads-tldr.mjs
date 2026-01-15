import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createTLDRClient } from './tldr-client.mjs';

const execAsync = promisify(exec);
const tldrClient = createTLDRClient();

export const TLDR_IMPACT_CONTEXT_KEY = 'tldr_impact';

export async function extractFilePathsFromDescription(description) {
  if (!description) return [];

  const filePattern = /[/\w\-.]+\.[a-z]+/g;
  const matches = description.match(filePattern) || [];

  return [...new Set(matches)].filter((path) => {
    const validExtensions = [
      '.js',
      '.ts',
      '.mjs',
      '.jsx',
      '.tsx',
      '.py',
      '.go',
      '.rs',
      '.java',
    ];
    return validExtensions.some((ext) => path.endsWith(ext));
  });
}

export async function runImpactAnalysis(filePaths, options = {}) {
  if (!filePaths || filePaths.length === 0) {
    return { success: false, error: 'No file paths provided' };
  }

  const depth = options.depth || 2;
  const results = {
    files: [],
    functions: [],
    tests: [],
    modules: [],
    dependencies: [],
    callers: [],
    callees: [],
  };

  try {
    for (const filePath of filePaths) {
      const impact = await tldrClient.getImpact(filePath, { depth });

      if (impact && !impact.error && impact.impact) {
        const imp = impact.impact;
        results.files.push(...(imp.files || []));
        results.functions.push(...(imp.functions || []));
        results.tests.push(...(imp.tests || []));
        results.modules.push(...(imp.modules || []));
        results.dependencies.push(...(imp.dependencies || []));
        results.callers.push(...(imp.callers || []));
        results.callees.push(...(imp.callees || []));
      }
    }

    results.files = [...new Set(results.files)];
    results.functions = [...new Set(results.functions)];
    results.tests = [...new Set(results.tests)];
    results.modules = [...new Set(results.modules)];
    results.dependencies = [...new Set(results.dependencies)];
    results.callers = [...new Set(results.callers)];
    results.callees = [...new Set(results.callees)];

    return {
      success: true,
      analyzedFiles: filePaths,
      impact: results,
      summary: `${filePaths.length} files analyzed. Functions: ${results.functions.length}, Tests: ${results.tests.length}, Modules: ${results.modules.length}`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function formatImpactForContext(impactResult) {
  if (!impactResult.success) {
    return null;
  }

  return {
    analyzedFiles: impactResult.analyzedFiles,
    impact: impactResult.impact,
    summary: impactResult.summary,
    timestamp: new Date().toISOString(),
    scopeCeiling: {
      enabled: true,
      message:
        'TLDR output is informational, not permissive. If scope exceeds impact, STOP and create new task.',
    },
  };
}

export async function extractScopeFromDescription(description) {
  if (!description) return { files: [], keywords: [] };

  const files = await extractFilePathsFromDescription(description);
  const keywords = [];

  const actionPatterns = [
    /(?:add|create|implement|update|modify|change|fix|remove|delete|refactor)\s+(\w+)/gi,
    /(?:in|to|for|with|using)\s+([a-zA-Z][a-zA-Z0-9_\-.]+)/g,
  ];

  for (const pattern of actionPatterns) {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        keywords.push(match[1]);
      }
    }
  }

  return { files, keywords: [...new Set(keywords)] };
}

export function validateScopeAgainstImpact(scope, impact) {
  if (!impact || !impact.success) {
    return {
      isValid: true,
      warnings: [],
      severity: 'none',
    };
  }

  const warnings = [];
  const impactFiles = new Set(impact.impact?.files || []);
  const scopeFiles = new Set(scope.files || []);

  const unexpectedFiles = [...scopeFiles].filter((f) => !impactFiles.has(f));

  if (unexpectedFiles.length > 0) {
    warnings.push(
      `Files in scope not in impact analysis: ${unexpectedFiles.join(', ')}`,
    );
  }

  const scopeKeywords = new Set(scope.keywords || []);
  const missingKeywords = [...scopeKeywords].filter(
    (k) =>
      !impact.impact?.functions?.includes(k) &&
      !impact.impact?.modules?.includes(k),
  );

  if (missingKeywords.length > 0) {
    warnings.push(
      `Scope mentions components not in impact: ${missingKeywords.join(', ')}`,
    );
  }

  const severity =
    warnings.length > 2 ? 'high' : warnings.length > 0 ? 'medium' : 'none';

  return {
    isValid: warnings.length === 0,
    warnings,
    severity,
    recommendation:
      severity !== 'none'
        ? 'STOP work. Create new Beads task with expanded scope.'
        : null,
  };
}

export function formatImpactForDisplay(impactContext) {
  if (!impactContext) {
    return '';
  }

  const lines = [];
  lines.push('\n---\n**TLDR Impact Analysis**');
  lines.push(
    `_Scope Ceiling Guardrail: TLDR output is informational, not permissive_`,
  );
  lines.push('');

  if (impactContext.analyzedFiles) {
    lines.push(`**Analyzed Files**: ${impactContext.analyzedFiles.join(', ')}`);
  }

  if (impactContext.impact) {
    const imp = impactContext.impact;

    if (imp.files && imp.files.length > 0) {
      lines.push(`**Affected Files** (${imp.files.length}):`);
      const fileList = imp.files.slice(0, 10);
      for (const f of fileList) {
        lines.push(`  - ${f}`);
      }
      if (imp.files.length > 10) {
        lines.push(`  ... and ${imp.files.length - 10} more`);
      }
      lines.push('');
    }

    if (imp.tests && imp.tests.length > 0) {
      lines.push(`**Affected Tests** (${imp.tests.length}):`);
      const testList = imp.tests.slice(0, 10);
      for (const t of testList) {
        lines.push(`  - ${t}`);
      }
      if (imp.tests.length > 10) {
        lines.push(`  ... and ${imp.tests.length - 10} more`);
      }
      lines.push('');
    }

    if (imp.functions && imp.functions.length > 0) {
      lines.push(`**Affected Functions** (${imp.functions.length}):`);
      lines.push(`\`${imp.functions.slice(0, 15).join(', ')}\``);
      if (imp.functions.length > 15) {
        lines.push(`... and ${imp.functions.length - 15} more`);
      }
      lines.push('');
    }

    if (imp.modules && imp.modules.length > 0) {
      lines.push(`**Affected Modules**: ${imp.modules.join(', ')}`);
      lines.push('');
    }

    if (imp.callers && imp.callers.length > 0) {
      lines.push(`**Callers** (files calling this code):`);
      lines.push(`\`${imp.callers.join(', ')}\``);
      lines.push('');
    }

    if (imp.callees && imp.callees.length > 0) {
      lines.push(`**Callees** (code this code calls):`);
      lines.push(`\`${imp.callees.join(', ')}\``);
      lines.push('');
    }
  }

  if (impactContext.scopeCeiling) {
    lines.push('---\n**SCOPE GUARDRAIL**');
    lines.push(impactContext.scopeCeiling.message);
  }

  return lines.join('\n');
}

export async function enhanceBeadCreateWithTLDR(options = {}) {
  const { description, autoImpact = false } = options;

  if (!autoImpact || !description) {
    return { options, impactContext: null };
  }

  const filePaths = extractFilePathsFromDescription(description);

  if (filePaths.length === 0) {
    return { options, impactContext: null };
  }

  const impactResult = await runImpactAnalysis(filePaths);
  const impactContext = formatImpactForContext(impactResult);

  if (impactContext) {
    const notesFlag = `--notes "${TLDR_IMPACT_CONTEXT_KEY}: ${JSON.stringify(impactContext).replace(/"/g, '\\"')}"`;
    options.notes = options.notes
      ? `${options.notes}\n${notesFlag}`
      : notesFlag;
  }

  return { options, impactContext };
}

export async function getBeadImpactFromNotes(beadId) {
  try {
    const { stdout } = await execAsync(`bd show ${beadId}`, {
      maxBuffer: 1024 * 1024,
    });

    const notesMatch = stdout.match(/notes[:\s]*([^\n]+)/i);
    if (!notesMatch) return null;

    const tldrMatch = notesMatch[1].match(
      new RegExp(`${TLDR_IMPACT_CONTEXT_KEY}: (.+)`),
    );
    if (!tldrMatch) return null;

    try {
      return JSON.parse(tldrMatch[1].replace(/\\"/g, '"'));
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
