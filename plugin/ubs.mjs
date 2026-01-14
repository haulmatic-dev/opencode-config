const UBSClient = require('../lib/ubs/ubs-client.js');

export const UBSPPlugin = async ({
  project: _project,
  client: _client,
  $: _$,
  directory: _directory,
  worktree: _worktree,
}) => {
  console.log('[UBS Plugin] Initializing...');

  const ubs = new UBSClient();
  const config = ubs.config;

  if (!config.enabled) {
    console.log('[UBS Plugin] Disabled in config');
    return {};
  }

  const health = await ubs.healthCheck();

  if (!health.healthy) {
    console.warn(
      `[UBS Plugin] Health check failed: ${health.issues.join(', ')}`,
    );
    console.warn('[UBS Plugin] Graceful degradation - UBS features disabled');
    return {};
  }

  console.log(`[UBS Plugin] Ready (version: ${health.version})`);

  return {
    'session.start': async () => {
      console.log('[UBS Plugin] Session start hook');

      if (config.autoUpdate) {
        const updateResult = await ubs.update();
        if (updateResult.success) {
          console.log(`[UBS Plugin] ${updateResult.message}`);
        }
      }
    },

    'agent.execute.before': async (input, output) => {
      if (!config.autoScan) {
        return;
      }

      const agentName = input.agent || 'agent';
      console.log(`[UBS Plugin] Pre-execution hook for ${agentName}`);

      const changedFiles = getChangedFiles();
      if (changedFiles.length === 0) {
        console.log('[UBS Plugin] No files changed, skipping scan');
        return;
      }

      const relevantFiles = filterUBSSupportedFiles(changedFiles);
      if (relevantFiles.length === 0) {
        console.log('[UBS Plugin] No UBS-supported files changed');
        return;
      }

      console.log(
        `[UBS Plugin] Scanning ${relevantFiles.length} changed files...`,
      );

      const scanResult = await ubs.scan(relevantFiles, {
        ciMode: config.ciMode,
      });

      if (scanResult.success) {
        console.log('[UBS Plugin] No issues found in pre-scan');
        return;
      }

      const parsed = ubs.parseOutput(scanResult.output);

      console.log(`[UBS Plugin] Pre-scan results: ${parsed.summary}`);

      if (config.failOnCritical && parsed.critical > 0) {
        console.error(
          `[UBS Plugin] Blocking execution - ${parsed.critical} critical issues found`,
        );

        const error = new Error(
          `UBS found ${parsed.critical} critical issues. Fix them before proceeding.`,
        );
        error.code = 'UBS_CRITICAL_ISSUES';
        error.ubsFindings = parsed;
        throw error;
      }

      output.ubsPreScanResults = parsed;
    },

    'agent.execute.after': async (input, output, error) => {
      if (!config.autoScan) {
        return;
      }

      const agentName = input.agent || 'agent';
      console.log(`[UBS Plugin] Post-execution hook for ${agentName}`);

      if (error) {
        console.log('[UBS Plugin] Agent failed, skipping post-scan');
        return;
      }

      const changedFiles = getChangedFiles();
      if (changedFiles.length === 0) {
        console.log('[UBS Plugin] No files changed by agent, skipping scan');
        return;
      }

      const relevantFiles = filterUBSSupportedFiles(changedFiles);
      if (relevantFiles.length === 0) {
        console.log('[UBS Plugin] No UBS-supported files changed by agent');
        return;
      }

      console.log(
        `[UBS Plugin] Scanning ${relevantFiles.length} modified files...`,
      );

      const scanResult = await ubs.scan(relevantFiles, {
        ciMode: config.ciMode,
      });

      if (scanResult.success) {
        console.log('[UBS Plugin] No issues found in post-scan');
        return;
      }

      const parsed = ubs.parseOutput(scanResult.output);
      console.log(`[UBS Plugin] Post-scan results: ${parsed.summary}`);

      if (parsed.critical > 0) {
        console.error(
          `[UBS Plugin] Agent introduced ${parsed.critical} critical issues`,
        );

        const error = new Error(
          `Agent introduced ${parsed.critical} critical issues via UBS. Please fix them.`,
        );
        error.code = 'UBS_REGRESSION';
        error.ubsFindings = parsed;
        throw error;
      }

      output.ubsPostScanResults = parsed;
    },

    'system.prompt': async (prompt) => {
      if (!config.autoScan) {
        return prompt;
      }

      const quickRef = ubs.getQuickReference();

      return `${prompt}

---

${quickRef}
`;
    },
  };
};

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('[UBS Plugin] Failed to get changed files:', error.message);
    return [];
  }
}

function filterUBSSupportedFiles(files) {
  const ubsExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'mjs',
    'cjs',
    'py',
    'pyw',
    'pyi',
    'c',
    'cc',
    'cpp',
    'cxx',
    'h',
    'hh',
    'hpp',
    'hxx',
    'rs',
    'go',
    'java',
    'rb',
  ];

  return files.filter((file) => {
    const ext = file.split('.').pop().toLowerCase();
    return ubsExtensions.includes(ext);
  });
}

function execSync(command) {
  const { execSync: exec } = require('node:child_process');
  return exec(command);
}
