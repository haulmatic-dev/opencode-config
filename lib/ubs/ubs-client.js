#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'ubs_config.json');
const UPDATE_CHECK_PATH = path.join(__dirname, '..', '.ubs-last-update');

class UBSClient {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error(`[UBS] Failed to load config: ${error.message}`);
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      enabled: true,
      autoScan: true,
      failOnCritical: true,
      autoUpdate: true,
      updateInterval: 86400,
      categories: [],
      skipCategories: [],
      languageFilter: [],
      ciMode: false,
      verbose: false,
    };
  }

  isInstalled() {
    try {
      execSync('which ubs', { encoding: 'utf8' });
      return true;
    } catch (error) {
      return false;
    }
  }

  getVersion() {
    if (!this.isInstalled()) {
      return null;
    }

    try {
      const version = execSync('ubs --version', { encoding: 'utf8' }).trim();
      return version;
    } catch (error) {
      console.error(`[UBS] Failed to get version: ${error.message}`);
      return null;
    }
  }

  shouldCheckForUpdates() {
    if (!this.config.autoUpdate) {
      return false;
    }

    try {
      if (!fs.existsSync(UPDATE_CHECK_PATH)) {
        return true;
      }

      const lastUpdate = parseInt(fs.readFileSync(UPDATE_CHECK_PATH, 'utf8'));
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - lastUpdate;

      return elapsed >= this.config.updateInterval;
    } catch (error) {
      console.error(`[UBS] Failed to check update interval: ${error.message}`);
      return true;
    }
  }

  recordUpdateCheck() {
    try {
      const now = Math.floor(Date.now() / 1000);
      fs.writeFileSync(UPDATE_CHECK_PATH, now.toString());
    } catch (error) {
      console.error(`[UBS] Failed to record update check: ${error.message}`);
    }
  }

  async update() {
    if (!this.isInstalled()) {
      console.warn('[UBS] Not installed, skipping update');
      return { success: false, message: 'Not installed' };
    }

    if (!this.shouldCheckForUpdates()) {
      return { success: true, message: 'Update check not needed yet' };
    }

    try {
      console.log('[UBS] Checking for updates...');
      execSync(
        'curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh?$(date +%s)" | bash -s -- --update-modules',
        {
          encoding: 'utf8',
          stdio: 'inherit',
        },
      );
      this.recordUpdateCheck();
      return { success: true, message: 'Updated successfully' };
    } catch (error) {
      console.error(`[UBS] Update failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async scan(targets = [], options = {}) {
    if (!this.isInstalled()) {
      console.warn('[UBS] Not installed, skipping scan');
      return { success: false, output: '', exitCode: 0 };
    }

    const {
      categories = this.config.categories,
      skipCategories = this.config.skipCategories,
      languageFilter = this.config.languageFilter,
      failOnWarning = this.config.failOnCritical,
      ciMode = this.config.ciMode,
      verbose = this.config.verbose,
    } = options;

    const commandParts = ['ubs'];

    if (categories.length > 0) {
      commandParts.push(`--category=${categories.join(',')}`);
    }

    if (skipCategories.length > 0) {
      commandParts.push(`--skip=${skipCategories.join(',')}`);
    }

    if (languageFilter.length > 0) {
      commandParts.push(`--only=${languageFilter.join(',')}`);
    }

    if (failOnWarning) {
      commandParts.push('--fail-on-warning');
    }

    if (ciMode) {
      commandParts.push('--ci');
    }

    if (verbose) {
      commandParts.push('-v');
    }

    if (targets.length > 0) {
      commandParts.push(...targets);
    } else {
      commandParts.push('.');
    }

    try {
      const output = execSync(commandParts.join(' '), {
        encoding: 'utf8',
        stdio: verbose ? 'inherit' : 'pipe',
      });
      return { success: true, output, exitCode: 0 };
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      return { success: false, output, exitCode: error.status || 1 };
    }
  }

  parseOutput(output) {
    const result = {
      critical: 0,
      warnings: 0,
      info: 0,
      findings: [],
      summary: '',
    };

    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('🔥 CRITICAL')) {
        result.critical++;
      } else if (line.includes('⚠️') || line.includes('WARNING')) {
        result.warnings++;
      } else if (line.includes('ℹ️') || line.includes('INFO')) {
        result.info++;
      }

      result.findings.push(line.trim());
    }

    result.summary = `Critical: ${result.critical}, Warnings: ${result.warnings}, Info: ${result.info}`;
    return result;
  }

  async healthCheck() {
    const result = {
      installed: false,
      version: null,
      healthy: false,
      issues: [],
    };

    if (!this.isInstalled()) {
      result.issues.push('UBS not installed');
      return result;
    }

    result.installed = true;
    result.version = this.getVersion();

    if (!result.version) {
      result.issues.push('Failed to get UBS version');
      return result;
    }

    result.healthy = true;
    return result;
  }

  getQuickReference() {
    return `## UBS Quick Reference for AI Agents

UBS stands for "Ultimate Bug Scanner": **The AI Coding Agent's Secret Weapon: Flagging Likely Bugs for Fixing Early On**

**Install:**
\`\`\`bash
curl -sSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash
\`\`\`

**Golden Rule:** \`ubs <changed-files>\` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

**Commands:**
\`\`\`bash
ubs file.ts file2.py                    # Specific files (< 1s) — USE THIS
ubs $(git diff --name-only --cached)    # Staged files — before commit
ubs --only=js,python src/               # Language filter (3-5x faster)
ubs --ci --fail-on-warning .            # CI mode — before PR
ubs --help                              # Full command reference
ubs .                                   # Whole project (ignores things like .venv and node_modules automatically)
\`\`\`

**Output Format:**
\`\`\`
⚠️  Category (N errors)
    file.ts:42:5 – Issue description
    💡 Suggested fix
Exit code: 1
\`\`\`

Parse: \`file:line:col\` → location | 💡 → how to fix | Exit 0/1 → pass/fail

**Fix Workflow:**
1. Read finding → category + fix suggestion
2. Navigate \`file:line:col\` → view context
3. Verify real issue (not false positive)
4. Fix root cause (not symptom)
5. Re-run \`ubs <file>\` → exit 0
6. Commit

**Speed Critical:**
Scope to changed files. \`ubs src/file.ts\` (< 1s) vs \`ubs .\` (30s). Never full scan for small edits.

**Bug Severity:**
- **Critical** (always fix): Null safety, XSS/injection, async/await, memory leaks
- **Important** (production): Type narrowing, division-by-zero, resource leaks
- **Contextual** (judgment): TODO/FIXME, console logs

**Anti-Patterns:**
- ❌ Ignore findings → ✅ Investigate each
- ❌ Full scan per edit → ✅ Scope to file
- ❌ Fix symptom (\`if (x) { x.y }\`) → ✅ Root cause (\`x?.y\`)
`;
  }
}

module.exports = UBSClient;
