import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const execAsync = promisify(exec);

const BIN_DIR = new URL('../bin', import.meta.url).pathname;
const WORKSPACE_INIT = `${BIN_DIR}/workspace-init`;
const SYSTEM_INIT = `${BIN_DIR}/opencode-init`;
const SYSTEM_INIT_INTERACTIVE = `${BIN_DIR}/opencode-init-interactive`;

class SetupPlugin {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.autoPrompt = options.autoPrompt !== false;
  }

  async checkWorkspaceInit() {
    try {
      const { stdout } = await execAsync(
        'ls -la .beads .cass .git 2>/dev/null',
        {
          cwd: process.cwd(),
        },
      );
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
    'chat.command.setup': async () => {
      return {
        response: `## OpenCode Setup Commands

### System Setup
- **System Setup**: Run system-wide tool installation
  - Bash version (non-interactive): \`${SYSTEM_INIT}\`
  - Interactive version: \`${SYSTEM_INIT_INTERACTIVE}\`

### Workspace Setup
- **Workspace Setup**: Initialize current project with git, cass_memory, and beads
  - Run: \`${WORKSPACE_INIT}\`
  - This initializes: git repo, cass_memory (cm init --repo), beads (bd init)

### Quick Check
- **Check Status**: See what's installed and what needs setup
  - Run: \`~/.config/opencode/hooks/session-start.sh\`

### Available Commands
- \`opencode-init\` - System-wide tool installation (bash)
- \`opencode-init-interactive\` - Interactive system setup (Node.js)
- \`workspace-init\` - Initialize project workspace
- \`session-start.sh\` - Check service status
`,
      };
    },

    'session.start': async () => {
      if (!plugin || !plugin.enabled) {
        return;
      }

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

      if (missingSystemTools.length > 0) {
        parts.push('⚠️  Some system tools are missing:');
        parts.push(plugin.formatSystemStatus(systemStatus));
        parts.push('To install missing tools:');
        parts.push(`  - Run interactive setup: ${SYSTEM_INIT_INTERACTIVE}`);
        parts.push(`  - Or run bash setup: ${SYSTEM_INIT}`);
        parts.push('');
      }

      if (needsWorkspaceInit) {
        parts.push('⚠️  Workspace needs initialization:');
        parts.push(plugin.formatWorkspaceStatus(workspaceStatus));
        parts.push('To initialize workspace:');
        parts.push(`  - Run: ${WORKSPACE_INIT}`);
        parts.push('');
      }

      parts.push('💡 Type \`/setup\` for setup commands');

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

        if (missingSystemTools.length > 0 && missingSystemTools.length < 3) {
          const helpMsg = `\n\n💡 Setup: Some tools are missing. Run \`opencode-init-interactive\` to install them.`;
          output.systemPrompt = (output.systemPrompt || '') + helpMsg;
        }

        if (needsWorkspaceInit && message.toLowerCase().includes('workspace')) {
          const helpMsg = `\n\n💡 Workspace: Run \`workspace-init\` to initialize your project.`;
          output.systemPrompt = (output.systemPrompt || '') + helpMsg;
        }
      }
    },
  };
};
