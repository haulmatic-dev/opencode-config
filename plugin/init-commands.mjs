import { exec } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const BIN_DIR = new URL('../bin', import.meta.url).pathname;
const WORKSPACE_INIT = `${BIN_DIR}/workspace-init`;
const SYSTEM_INIT = `${BIN_DIR}/opencode-init`;

class InitCommandsPlugin {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
  }

  async runWorkspaceInit(force = false) {
    const cmd = force ? `${WORKSPACE_INIT} --force` : WORKSPACE_INIT;
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 120000,
      });
      return { success: true, output: stdout, error: stderr || null };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
        stderr: error.stderr || '',
      };
    }
  }

  async runSystemInit(quiet = false) {
    const cmd = quiet ? `${SYSTEM_INIT} --quiet` : SYSTEM_INIT;
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 300000,
      });
      return { success: true, output: stdout, error: stderr || null };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
        stderr: error.stderr || '',
      };
    }
  }

  async checkWorkspaceStatus() {
    const hasGit = existsSync(`${process.cwd()}/.git`);
    const hasBeads = existsSync(`${process.cwd()}/.beads`);
    const hasCass = existsSync(`${process.cwd()}/.cass`);
    const hasTLDR = existsSync(`${process.cwd()}/.tldr`);

    return {
      initialized: hasGit && hasBeads && hasCass,
      git: hasGit,
      beads: hasBeads,
      cass: hasCass,
      tldr: hasTLDR,
    };
  }

  async checkSystemStatus() {
    const tools = [
      { cmd: 'cm', name: 'cass_memory' },
      { cmd: 'bd', name: 'beads_cli' },
      { cmd: 'bv', name: 'beads_viewer' },
      { cmd: 'biome', name: 'biome' },
      { cmd: 'prettier', name: 'prettier' },
      { cmd: 'tldr', name: 'tldr' },
      { cmd: 'ubs', name: 'ubs' },
    ];

    const status = {};
    for (const { cmd, name } of tools) {
      try {
        await execAsync(`command -v ${cmd}`, { stdio: 'pipe' });
        status[name] = true;
      } catch {
        status[name] = false;
      }
    }

    try {
      await execAsync('command -v opencode-init', { stdio: 'pipe' });
      status.opencode_init = true;
    } catch {
      status.opencode_init = false;
    }

    return status;
  }
}

let plugin = null;

export const initCommands = async ({
  project: _project,
  client: _client,
  $,
  directory: _directory,
  worktree: _worktree,
}) => {
  if (!plugin) {
    plugin = new InitCommandsPlugin();
  }

  return {
    '/workspace-init': {
      description:
        'Initialize this project workspace with opencode (git, cass_memory, Beads, TLDR, Biome, Prettier, git hooks)',
      parameters: {
        force: {
          type: 'boolean',
          description:
            'Run in non-interactive mode with default answers (useful for CI/CD)',
          optional: true,
        },
      },
      handler: async ({ force = false }) => {
        const result = await plugin.runWorkspaceInit(force);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `✅ Workspace initialization completed successfully!\n\n${result.output}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Workspace initialization failed:\n${result.error}\n\n${result.stderr || result.output}`,
              },
            ],
          };
        }
      },
    },

    '/opencode-init': {
      description:
        'Install and configure opencode system-wide tools (cass_memory, Beads, TLDR, Biome, Prettier, UBS)',
      parameters: {
        quiet: {
          type: 'boolean',
          description:
            'Run in quiet mode without interactive prompts (useful for automation)',
          optional: true,
        },
      },
      handler: async ({ quiet = false }) => {
        const result = await plugin.runSystemInit(quiet);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `✅ System initialization completed successfully!\n\n${result.output}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ System initialization failed:\n${result.error}\n\n${result.stderr || result.output}`,
              },
            ],
          };
        }
      },
    },

    '/workspace-status': {
      description:
        'Check the current workspace initialization status (git, cass_memory, Beads, TLDR)',
      parameters: {},
      handler: async () => {
        const status = await plugin.checkWorkspaceStatus();
        const systemStatus = await plugin.checkSystemStatus();

        let message = '## Workspace Status\n\n';
        message += `Git: ${status.git ? '✅' : '❌'} initialized\n`;
        message += `cass_memory: ${status.cass ? '✅' : '❌'} initialized\n`;
        message += `Beads: ${status.beads ? '✅' : '❌'} initialized\n`;
        message += `TLDR: ${status.tldr ? '✅' : '⚪'} indexed\n`;
        message += '\n## System Tools\n\n';

        const missingTools = [];
        for (const [tool, installed] of Object.entries(systemStatus)) {
          if (tool !== 'opencode_init') {
            message += `${installed ? '✅' : '❌'} ${tool}: ${installed ? 'installed' : 'missing'}\n`;
            if (!installed) {
              missingTools.push(tool);
            }
          }
        }

        message += '\n';

        if (missingTools.length > 0) {
          message += `⚠️  Missing tools: ${missingTools.join(', ')}\n`;
          message += `Run: /opencode-init\n\n`;
        }

        if (!status.initialized) {
          message += `⚠️  Workspace not fully initialized\n`;
          message += `Run: /workspace-init\n\n`;
        }

        if (!systemStatus.opencode_init) {
          message += `⚠️  opencode-init not in PATH\n`;
          message += `Add to PATH or run: source ~/.zshrc\n\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      },
    },
  };
};
