import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const BIN_DIR = new URL('../bin', import.meta.url).pathname;
const WORKSPACE_INIT = `${BIN_DIR}/workspace-init`;
const SYSTEM_INIT = `${BIN_DIR}/opencode-init`;

class SetupPlugin {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.autoPrompt = options.autoPrompt !== false;
  }

  async checkWorkspaceInit() {
    try {
      const hasGit = existsSync(`${process.cwd()}/.git`);
      const hasBeads = existsSync(`${process.cwd()}/.beads`);
      const hasCass = existsSync(`${process.cwd()}/.cass`);

      return { git: hasGit, beads: hasBeads, cass: hasCass };
    } catch {
      return { git: false, beads: false, cass: false };
    }
  }

  async checkSystemTools() {
    const tools = {
      cm: 'cass_memory',
      bd: 'beads_cli',
      bv: 'beads_viewer',
      biome: 'biome',
      prettier: 'prettier',
      ubs: 'ubs',
      osgrep: 'osgrep',
    };

    const status = {};
    for (const [cmd, name] of Object.entries(tools)) {
      try {
        await execAsync(`command -v ${cmd}`, { stdio: 'pipe' });
        status[name] = true;
      } catch {
        status[name] = false;
      }
    }

    // Check if ~/.config/opencode/bin is in PATH
    try {
      await execAsync('command -v opencode-init', { stdio: 'pipe' });
      status['opencode_bin_in_path'] = true;
    } catch {
      status['opencode_bin_in_path'] = false;
    }

    return status;
  }

  formatWorkspaceStatus(status) {
    const parts = [];
    parts.push('\n## Workspace Status');
    parts.push(`\n  Git: ${status.git ? '✓' : '○'} initialized`);
    parts.push(`  cass_memory: ${status.cass ? '✓' : '○'} initialized`);
    parts.push(`  Beads: ${status.beads ? '✓' : '○'} initialized`);
    parts.push('\n');
    return parts.join('\n');
  }

  formatSystemStatus(status) {
    const parts = [];
    parts.push('\n## System Tools Status');
    parts.push(
      '\n  cass_memory (cm): ' +
        (status.cass_memory ? '✓ installed' : '○ missing'),
    );
    parts.push(
      '  Beads CLI (bd): ' + (status.beads_cli ? '✓ installed' : '○ missing'),
    );
    parts.push(
      '  Beads Viewer (bv): ' +
        (status.beads_viewer ? '✓ installed' : '○ missing'),
    );
    parts.push('  Biome: ' + (status.biome ? '✓ installed' : '○ missing'));
    parts.push(
      '  Prettier: ' + (status.prettier ? '✓ installed' : '○ missing'),
    );
    parts.push(
      '  UBS: ' + (status.ubs ? '✓ installed' : '○ missing (optional)'),
    );
    parts.push(
      '  Osgrep: ' + (status.osgrep ? '✓ installed' : '○ missing (optional)'),
    );

    if (!status.opencode_bin_in_path) {
      parts.push('  ~/.config/opencode/bin in PATH: ⚠️  NOT configured');
    }

    parts.push('\n');
    return parts.join('\n');
  }
}

let plugin = null;

export const setup = async ({
  project: _project,
  client: _client,
  $: _$,
  directory: _directory,
  worktree: _worktree,
}) => {
  const configPath = new URL('../setup_config.json', import.meta.url);
  let config = { enabled: true, autoPrompt: true };

  try {
    const configContent = await fetch(configPath);
    if (configContent.ok) {
      config = await configContent.json();
    }
  } catch (_e) {
    console.log('[SetupPlugin] No config found, using defaults');
  }

  if (!plugin) {
    plugin = new SetupPlugin(config);
  }

  return {
    'session.start': async () => {
      if (!plugin || !plugin.enabled) {
        return;
      }

      const hooksDir = new URL('../hooks', import.meta.url).pathname;
      const sessionStartHook = `${hooksDir}/session-start.sh`;

      // Execute session-start.sh hook
      try {
        console.log('[Setup Plugin] Running session-start.sh hook...');
        await execAsync(`bash ${sessionStartHook}`, { stdio: 'inherit' });
        console.log('[Setup Plugin] session-start.sh completed successfully');
      } catch (error) {
        console.error('[Setup Plugin] session-start.sh failed:', error.message);
      }

      // Display status information
      const workspaceStatus = await plugin.checkWorkspaceInit();
      const systemStatus = await plugin.checkSystemTools();

      const missingSystemTools = Object.entries(systemStatus)
        .filter(([_, installed]) => !installed)
        .map(([name]) => name);

      const needsWorkspaceInit =
        !workspaceStatus.git || !workspaceStatus.cass || !workspaceStatus.beads;

      if (missingSystemTools.length === 0 && !needsWorkspaceInit) {
        return;
      }

      const parts = [];
      parts.push('## OpenCode Setup Status');
      parts.push('');

      if (missingSystemTools.length > 0 || !systemStatus.opencode_bin_in_path) {
        parts.push('⚠️  Setup needed:');
        parts.push(plugin.formatSystemStatus(systemStatus));
        parts.push('');

        if (missingSystemTools.length > 0) {
          parts.push('To install missing tools:');
          parts.push(`  - Run: ${SYSTEM_INIT}`);
        }

        if (!systemStatus.opencode_bin_in_path) {
          parts.push('');
          parts.push('To configure PATH:');
          parts.push(`  - Run: source ${SYSTEM_INIT}`);
        }

        parts.push('');
      }

      if (needsWorkspaceInit) {
        parts.push('⚠️  Workspace needs initialization:');
        parts.push(plugin.formatWorkspaceStatus(workspaceStatus));
        parts.push('To initialize workspace:');
        parts.push(`  - Run: ${WORKSPACE_INIT}`);
        parts.push('');
      }

      parts.push('## Setup Commands');
      parts.push(`- System setup: \`${SYSTEM_INIT}\``);
      parts.push(`- Workspace setup: \`${WORKSPACE_INIT}\``);
      parts.push('- Check status: `~/.config/opencode/hooks/session-start.sh`');

      return { systemPrompt: parts.join('\n') };
    },

    'chat.message': async (input, output) => {
      const { message } = input;

      if (plugin && plugin.enabled && plugin.autoPrompt) {
        const workspaceStatus = await plugin.checkWorkspaceInit();
        const systemStatus = await plugin.checkSystemTools();

        const missingSystemTools = Object.entries(systemStatus)
          .filter(([_, installed]) => !installed)
          .map(([name]) => name);

        const needsWorkspaceInit =
          !workspaceStatus.git ||
          !workspaceStatus.cass ||
          !workspaceStatus.beads;

        if (
          (missingSystemTools.length > 0 && missingSystemTools.length < 3) ||
          !systemStatus.opencode_bin_in_path
        ) {
          const helpMsg = `\n\n💡 Setup: Run \`${SYSTEM_INIT}\` to install and configure tools.`;
          output.systemPrompt = (output.systemPrompt || '') + helpMsg;
        }

        if (needsWorkspaceInit && message.toLowerCase().includes('workspace')) {
          const helpMsg = `\n\n💡 Workspace: Run \`${WORKSPACE_INIT}\` to initialize your project.`;
          output.systemPrompt = (output.systemPrompt || '') + helpMsg;
        }
      }
    },
  };
};
